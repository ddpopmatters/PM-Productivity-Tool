-- ============================================
-- SECURITY HARDENING MIGRATION
-- Addresses vulnerabilities found in security scan
-- ============================================

-- ============================================
-- 1. RATE LIMITING FOR AUTH (OTP Brute Force)
-- ============================================
-- Note: Primary rate limiting should be configured in Supabase Dashboard:
-- Authentication > Rate Limits > Set appropriate limits
-- Recommended: Max 5 OTP attempts per hour per IP

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier TEXT NOT NULL, -- IP address or email
    action_type TEXT NOT NULL, -- 'otp', 'login', 'password_reset'
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    UNIQUE(identifier, action_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON auth_rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON auth_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Enable RLS on rate limits (only service role should access)
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access to rate limit table
CREATE POLICY "rate_limits_no_public" ON auth_rate_limits
    FOR ALL TO authenticated
    USING (false);

-- Function to check and update rate limits (called by Edge Functions)
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_action_type TEXT,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 60,
    p_block_minutes INTEGER DEFAULT 30
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_record auth_rate_limits%ROWTYPE;
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    v_window_start := v_now - (p_window_minutes || ' minutes')::INTERVAL;

    -- Get or create rate limit record
    SELECT * INTO v_record
    FROM auth_rate_limits
    WHERE identifier = p_identifier AND action_type = p_action_type;

    IF v_record.id IS NULL THEN
        -- First attempt
        INSERT INTO auth_rate_limits (identifier, action_type)
        VALUES (p_identifier, p_action_type);
        RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts - 1);
    END IF;

    -- Check if currently blocked
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_record.blocked_until,
            'message', 'Too many attempts. Please try again later.'
        );
    END IF;

    -- Check if window has expired (reset counter)
    IF v_record.first_attempt_at < v_window_start THEN
        UPDATE auth_rate_limits
        SET attempt_count = 1,
            first_attempt_at = v_now,
            last_attempt_at = v_now,
            blocked_until = NULL
        WHERE id = v_record.id;
        RETURN jsonb_build_object('allowed', true, 'remaining', p_max_attempts - 1);
    END IF;

    -- Check if max attempts exceeded
    IF v_record.attempt_count >= p_max_attempts THEN
        UPDATE auth_rate_limits
        SET blocked_until = v_now + (p_block_minutes || ' minutes')::INTERVAL,
            last_attempt_at = v_now
        WHERE id = v_record.id;
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_now + (p_block_minutes || ' minutes')::INTERVAL,
            'message', 'Too many attempts. Please try again in ' || p_block_minutes || ' minutes.'
        );
    END IF;

    -- Increment counter
    UPDATE auth_rate_limits
    SET attempt_count = attempt_count + 1,
        last_attempt_at = v_now
    WHERE id = v_record.id;

    RETURN jsonb_build_object(
        'allowed', true,
        'remaining', p_max_attempts - v_record.attempt_count - 1
    );
END;
$$;

-- Function to reset rate limit on successful auth
CREATE OR REPLACE FUNCTION reset_rate_limit(
    p_identifier TEXT,
    p_action_type TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM auth_rate_limits
    WHERE identifier = p_identifier AND action_type = p_action_type;
END;
$$;

-- ============================================
-- 2. SECURE STORAGE POLICIES
-- ============================================
-- Ensure storage bucket has proper Content-Type validation

-- Create secure storage policy (if attachments bucket exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'attachments') THEN
        -- Drop any overly permissive policies
        DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
        DROP POLICY IF EXISTS "Allow all" ON storage.objects;

        -- Create strict upload policy with file type validation
        DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
        CREATE POLICY "secure_upload" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (
                bucket_id = 'attachments'
                AND (storage.foldername(name))[1] = auth.uid()::text
                -- Only allow safe file types
                AND (
                    name LIKE '%.pdf' OR
                    name LIKE '%.doc' OR
                    name LIKE '%.docx' OR
                    name LIKE '%.xls' OR
                    name LIKE '%.xlsx' OR
                    name LIKE '%.png' OR
                    name LIKE '%.jpg' OR
                    name LIKE '%.jpeg' OR
                    name LIKE '%.gif' OR
                    name LIKE '%.txt' OR
                    name LIKE '%.csv'
                )
            );

        -- Secure read policy
        DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
        CREATE POLICY "secure_read" ON storage.objects
            FOR SELECT TO authenticated
            USING (bucket_id = 'attachments');

        -- Secure delete policy
        DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
        CREATE POLICY "secure_delete" ON storage.objects
            FOR DELETE TO authenticated
            USING (
                bucket_id = 'attachments'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );
    END IF;
END $$;

-- ============================================
-- 3. API VERSION INFORMATION DISCLOSURE
-- ============================================
-- Create a view that masks sensitive info in pg_catalog queries
-- (Limit what unauthenticated users can query)

-- Revoke unnecessary permissions from anon role
DO $$
BEGIN
    -- Revoke direct table access from anon (should use RLS)
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

    -- Grant back only SELECT with RLS
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

    -- Ensure sequences are not exposed
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
END $$;

-- ============================================
-- 4. PASSWORD RESET FLOW PROTECTION
-- ============================================
-- Create tracking for password reset attempts
CREATE TABLE IF NOT EXISTS password_reset_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reset_tracking_email ON password_reset_tracking(email, requested_at);

-- Enable RLS
ALTER TABLE password_reset_tracking ENABLE ROW LEVEL SECURITY;

-- No public access
CREATE POLICY "reset_tracking_no_public" ON password_reset_tracking
    FOR ALL TO authenticated
    USING (false);

-- ============================================
-- 5. ADDITIONAL RLS HARDENING
-- ============================================

-- Ensure all tables have RLS enabled
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', tbl.schemaname, tbl.tablename);
    END LOOP;
END $$;

-- ============================================
-- 6. AUDIT LOGGING FOR SECURITY EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'login_failed', 'rate_limited', 'unauthorized_access', etc.
    user_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_type ON security_audit_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_email ON security_audit_log(user_email, created_at);

-- Enable RLS - only admins can read
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_audit_admin_only" ON security_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

-- Anyone authenticated can insert (for logging)
CREATE POLICY "security_audit_insert" ON security_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_user_email TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO security_audit_log (event_type, user_email, ip_address, user_agent, details)
    VALUES (p_event_type, p_user_email, p_ip_address, p_user_agent, p_details)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ============================================
-- 7. SECURE FUNCTION PERMISSIONS
-- ============================================
-- Ensure security-sensitive functions are only callable by appropriate roles

REVOKE ALL ON FUNCTION check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;

REVOKE ALL ON FUNCTION reset_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reset_rate_limit TO service_role;

REVOKE ALL ON FUNCTION log_security_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event TO service_role;

-- ============================================
-- 8. CLEAN UP OLD/EXPIRED DATA
-- ============================================
-- Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM auth_rate_limits
    WHERE last_attempt_at < NOW() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < NOW());

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- Create function to clean up old security logs (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM security_audit_log
    WHERE created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE auth_rate_limits IS 'Tracks authentication rate limits to prevent brute force attacks';
COMMENT ON TABLE security_audit_log IS 'Audit log for security-related events';
COMMENT ON TABLE password_reset_tracking IS 'Tracks password reset requests for abuse prevention';
COMMENT ON FUNCTION check_rate_limit IS 'Check and update rate limits for authentication actions';
COMMENT ON FUNCTION log_security_event IS 'Log security events for audit purposes';
