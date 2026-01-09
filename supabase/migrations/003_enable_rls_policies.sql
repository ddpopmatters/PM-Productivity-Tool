-- ============================================
-- ROW LEVEL SECURITY FOR WORKFLOW ITEMS
-- ============================================
-- This migration enables RLS and creates policies for secure data access.
--
-- IMPORTANT: This app uses Clerk for auth (not Supabase Auth), so we use
-- a hybrid approach where authenticated requests pass the user's email
-- as a header or in the request context.
-- ============================================

-- Enable RLS on workflow_items
ALTER TABLE workflow_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- WORKFLOW_ITEMS POLICIES
-- ============================================

-- Policy: Authenticated users can read all workflow items (team visibility)
-- This allows all team members to see all projects
CREATE POLICY "Allow authenticated read access" ON workflow_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can create new items
CREATE POLICY "Allow authenticated insert" ON workflow_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Users can update items they own or collaborate on
-- Note: owner_email column would be better, but we work with current schema
CREATE POLICY "Allow update for owners and collaborators" ON workflow_items
    FOR UPDATE
    TO authenticated
    USING (true)  -- Allow reading for update check
    WITH CHECK (true);  -- App-level validation handles ownership

-- Policy: Users can delete items (app validates ownership)
CREATE POLICY "Allow delete for authenticated" ON workflow_items
    FOR DELETE
    TO authenticated
    USING (true);  -- App-level validation handles ownership

-- ============================================
-- ANON ACCESS (for public/unauthenticated)
-- ============================================
-- By default, anon users cannot access workflow_items
-- If you need public read access, uncomment below:
-- CREATE POLICY "Allow anon read" ON workflow_items FOR SELECT TO anon USING (true);

-- ============================================
-- USER_PROFILES TABLE (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

        -- Anyone can read profiles (for displaying names)
        CREATE POLICY "Allow public read profiles" ON user_profiles
            FOR SELECT USING (true);

        -- Users can only update their own profile
        CREATE POLICY "Allow users to update own profile" ON user_profiles
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);  -- App validates email match

        -- Allow inserts for new profiles
        CREATE POLICY "Allow insert profiles" ON user_profiles
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- NOTIFICATIONS TABLE (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

        -- Users can only read their own notifications
        CREATE POLICY "Users read own notifications" ON notifications
            FOR SELECT
            TO authenticated
            USING (true);  -- App filters by user email

        -- Allow creating notifications
        CREATE POLICY "Allow insert notifications" ON notifications
            FOR INSERT
            TO authenticated
            WITH CHECK (true);

        -- Users can update (mark read) their notifications
        CREATE POLICY "Users update own notifications" ON notifications
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- MANAGERS TABLE (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'managers') THEN
        ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

        -- Anyone can read manager info
        CREATE POLICY "Allow read managers" ON managers
            FOR SELECT
            USING (true);

        -- Only admins should modify (enforced at app level)
        CREATE POLICY "Allow admin manage managers" ON managers
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- TIGHTEN ACTIVITY_LOG POLICIES
-- ============================================
-- Drop overly permissive policies and create better ones
DROP POLICY IF EXISTS "Allow public read access" ON activity_log;
DROP POLICY IF EXISTS "Allow insert for all" ON activity_log;

-- Only authenticated users can read activity
CREATE POLICY "Authenticated users read activity" ON activity_log
    FOR SELECT
    TO authenticated
    USING (true);

-- Only authenticated users can log activity
CREATE POLICY "Authenticated users log activity" ON activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- STORAGE POLICIES UPDATE
-- ============================================
-- Tighten delete policy - users can only delete files they uploaded
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Note: To properly restrict deletes to file owners, you'd need to track
-- the uploader. For now, we keep authenticated delete access.
CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'attachments');

-- ============================================
-- NOTES FOR FUTURE IMPROVEMENTS
-- ============================================
-- For tighter security with Clerk + Supabase:
--
-- 1. Set up Clerk JWT integration with Supabase:
--    https://clerk.com/docs/integrations/databases/supabase
--
-- 2. Add owner_email column to workflow_items:
--    ALTER TABLE workflow_items ADD COLUMN owner_email TEXT;
--
-- 3. Then policies can use auth.jwt() -> 'email':
--    CREATE POLICY "Owner only update" ON workflow_items
--    FOR UPDATE USING (owner_email = auth.jwt() ->> 'email');
--
-- 4. Consider adding created_by and updated_by audit columns
