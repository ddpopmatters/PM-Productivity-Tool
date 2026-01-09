-- ============================================
-- SECURE RLS POLICIES
-- ============================================
-- This migration replaces permissive RLS policies with proper ownership checks.
-- Previously, policies used USING(true) which allowed any authenticated user
-- to read/update/delete any record. Now policies enforce ownership at the database level.

-- ============================================
-- WORKFLOW_ITEMS TABLE
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow update for owners and collaborators" ON workflow_items;
DROP POLICY IF EXISTS "Allow delete for owners" ON workflow_items;
DROP POLICY IF EXISTS "Authenticated can insert workflow_items" ON workflow_items;
DROP POLICY IF EXISTS "Authenticated can read workflow_items" ON workflow_items;

-- Allow all authenticated users to read all items (needed for team visibility)
-- Note: Sensitive data should be filtered at application level if needed
CREATE POLICY "Authenticated can read workflow_items" ON workflow_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Only item owners can insert (owner_email must match their email)
CREATE POLICY "Users can create own items" ON workflow_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        owner_email = auth.jwt() ->> 'email'
        OR owner_email IS NULL  -- Allow null for initial creation, will be set by app
    );

-- Owners and collaborators can update items
CREATE POLICY "Owners and collaborators can update" ON workflow_items
    FOR UPDATE
    TO authenticated
    USING (
        -- Owner can always update
        owner_email = auth.jwt() ->> 'email'
        -- Collaborators can update (stored as JSON array of names, check by email too)
        OR collaborators::text ILIKE '%' || (auth.jwt() ->> 'email') || '%'
    )
    WITH CHECK (
        owner_email = auth.jwt() ->> 'email'
        OR collaborators::text ILIKE '%' || (auth.jwt() ->> 'email') || '%'
    );

-- Only owners can delete their items
CREATE POLICY "Owners can delete own items" ON workflow_items
    FOR DELETE
    TO authenticated
    USING (owner_email = auth.jwt() ->> 'email');

-- Admins have full access to all items
CREATE POLICY "Admins have full access to workflow_items" ON workflow_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );

-- ============================================
-- USER_PROFILES TABLE
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated can create profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated can update profiles" ON user_profiles;

-- Anyone authenticated can read profiles (needed for @mentions, assignments)
CREATE POLICY "Authenticated can read profiles" ON user_profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Users can only create their own profile
CREATE POLICY "Users can create own profile" ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (email = auth.jwt() ->> 'email');

-- Users can only update their own profile (except role - see trigger below)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (email = auth.jwt() ->> 'email')
    WITH CHECK (email = auth.jwt() ->> 'email');

-- Admins can update any profile (including roles)
CREATE POLICY "Admins can update any profile" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );

-- ============================================
-- ACTIVITY_LOG TABLE
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON activity_log;
DROP POLICY IF EXISTS "Authenticated can insert activity" ON activity_log;

-- Users can only read their own activity (or all if admin)
CREATE POLICY "Users read own activity or admins read all" ON activity_log
    FOR SELECT
    TO authenticated
    USING (
        actor_email = auth.jwt() ->> 'email'
        OR EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );

-- Any authenticated user can insert activity logs
CREATE POLICY "Authenticated can insert activity" ON activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- MANAGERS TABLE
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can read managers" ON managers;
DROP POLICY IF EXISTS "Authenticated can modify managers" ON managers;
DROP POLICY IF EXISTS "Authenticated can update managers" ON managers;
DROP POLICY IF EXISTS "Authenticated can delete managers" ON managers;

-- Anyone authenticated can read manager relationships
CREATE POLICY "Authenticated can read managers" ON managers
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify manager relationships
CREATE POLICY "Admins can insert managers" ON managers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update managers" ON managers
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete managers" ON managers
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        )
    );

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- Users can only read their own notifications
CREATE POLICY "Users read own notifications" ON notifications
    FOR SELECT
    TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

-- Any authenticated user can create notifications (for @mentions, assignments)
CREATE POLICY "Authenticated can create notifications" ON notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can only update (mark read) their own notifications
CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE
    TO authenticated
    USING (user_email = auth.jwt() ->> 'email')
    WITH CHECK (user_email = auth.jwt() ->> 'email');

-- ============================================
-- STORAGE POLICIES (attachments bucket)
-- ============================================

-- Note: Storage policies may need to be updated in Supabase Dashboard
-- or via storage-specific migration. The following are recommendations:

-- Recommended storage policies:
-- 1. Authenticated users can upload to attachments bucket
-- 2. Only file owners can delete their uploads
-- 3. All authenticated users can read attachments (for team collaboration)

-- ============================================
-- ROLE CHANGE PROTECTION TRIGGER
-- ============================================

-- Prevent non-admins from changing their own role
CREATE OR REPLACE FUNCTION prevent_role_self_elevation()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is being changed
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Check if the person making the change is an admin
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        ) THEN
            -- Non-admin trying to change role - revert to old role
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS enforce_role_change_permission ON user_profiles;
CREATE TRIGGER enforce_role_change_permission
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_self_elevation();

-- ============================================
-- COMMENTS
-- ============================================
--
-- Security improvements made:
-- 1. workflow_items: Only owners/collaborators can update, only owners can delete
-- 2. user_profiles: Users can only modify their own profile
-- 3. activity_log: Users can only see their own activity (admins see all)
-- 4. managers: Only admins can modify manager relationships
-- 5. notifications: Users can only see/update their own notifications
-- 6. Role changes: Protected by trigger - only admins can change roles
--
-- Note: These policies work with Supabase Auth. The auth.jwt() function
-- extracts the email from the authenticated user's JWT token.
