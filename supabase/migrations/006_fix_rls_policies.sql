-- ============================================
-- FIX RLS POLICIES - Drop all permissive policies
-- ============================================
-- This migration drops ALL existing permissive policies and creates secure ones.
-- Run this after 005 to ensure all old policies are removed.

-- ============================================
-- WORKFLOW_ITEMS TABLE - Drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "Allow all" ON workflow_items;
DROP POLICY IF EXISTS "Allow authenticated insert" ON workflow_items;
DROP POLICY IF EXISTS "Allow delete for authenticated" ON workflow_items;
DROP POLICY IF EXISTS "Allow update for owners and collaborators" ON workflow_items;
DROP POLICY IF EXISTS "Users can create own items" ON workflow_items;
DROP POLICY IF EXISTS "Authenticated can read workflow_items" ON workflow_items;
DROP POLICY IF EXISTS "Owners and collaborators can update" ON workflow_items;
DROP POLICY IF EXISTS "Owners can delete own items" ON workflow_items;
DROP POLICY IF EXISTS "Admins have full access to workflow_items" ON workflow_items;

-- Create secure policies for workflow_items
CREATE POLICY "workflow_items_select" ON workflow_items
    FOR SELECT TO authenticated
    USING (true);  -- All authenticated can read (needed for team visibility)

CREATE POLICY "workflow_items_insert" ON workflow_items
    FOR INSERT TO authenticated
    WITH CHECK (
        owner_email = auth.jwt() ->> 'email'
        OR owner_email IS NULL
    );

CREATE POLICY "workflow_items_update" ON workflow_items
    FOR UPDATE TO authenticated
    USING (
        owner_email = auth.jwt() ->> 'email'
        OR collaborators::text ILIKE '%' || (auth.jwt() ->> 'email') || '%'
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    )
    WITH CHECK (
        owner_email = auth.jwt() ->> 'email'
        OR collaborators::text ILIKE '%' || (auth.jwt() ->> 'email') || '%'
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

CREATE POLICY "workflow_items_delete" ON workflow_items
    FOR DELETE TO authenticated
    USING (
        owner_email = auth.jwt() ->> 'email'
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

-- ============================================
-- USER_PROFILES TABLE - Drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "Allow insert for all" ON user_profiles;
DROP POLICY IF EXISTS "Allow update for all" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;

-- Create secure policies for user_profiles
CREATE POLICY "user_profiles_select" ON user_profiles
    FOR SELECT TO authenticated
    USING (true);  -- All authenticated can read (needed for @mentions)

CREATE POLICY "user_profiles_insert" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "user_profiles_update" ON user_profiles
    FOR UPDATE TO authenticated
    USING (
        email = auth.jwt() ->> 'email'
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    )
    WITH CHECK (
        email = auth.jwt() ->> 'email'
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

-- ============================================
-- MANAGERS TABLE - Drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "Allow all" ON managers;
DROP POLICY IF EXISTS "Anyone can read managers" ON managers;
DROP POLICY IF EXISTS "Authenticated can read managers" ON managers;
DROP POLICY IF EXISTS "Admins can insert managers" ON managers;
DROP POLICY IF EXISTS "Admins can update managers" ON managers;
DROP POLICY IF EXISTS "Admins can delete managers" ON managers;

-- Create secure policies for managers
CREATE POLICY "managers_select" ON managers
    FOR SELECT TO authenticated
    USING (true);  -- All authenticated can read

CREATE POLICY "managers_insert" ON managers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

CREATE POLICY "managers_update" ON managers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

CREATE POLICY "managers_delete" ON managers
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

-- ============================================
-- ACTIVITY_LOG TABLE - Drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users log activity" ON activity_log;
DROP POLICY IF EXISTS "Allow public read access" ON activity_log;
DROP POLICY IF EXISTS "Users read own activity or admins read all" ON activity_log;
DROP POLICY IF EXISTS "Authenticated can insert activity" ON activity_log;

-- Create secure policies for activity_log
CREATE POLICY "activity_log_select" ON activity_log
    FOR SELECT TO authenticated
    USING (
        actor_email = auth.jwt() ->> 'email'
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

CREATE POLICY "activity_log_insert" ON activity_log
    FOR INSERT TO authenticated
    WITH CHECK (actor_email = auth.jwt() ->> 'email');

-- ============================================
-- WORKSTREAMS TABLE - Drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "Allow all access" ON workstreams;

-- Create secure policies for workstreams
CREATE POLICY "workstreams_select" ON workstreams
    FOR SELECT TO authenticated
    USING (true);  -- All authenticated can read

CREATE POLICY "workstreams_insert" ON workstreams
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

CREATE POLICY "workstreams_update" ON workstreams
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

CREATE POLICY "workstreams_delete" ON workstreams
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

-- ============================================
-- NOTIFICATIONS TABLE - Ensure secure policies
-- ============================================
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;

-- Create secure policies for notifications (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        EXECUTE 'CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_email = auth.jwt() ->> ''email'')';
        EXECUTE 'CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (user_email = auth.jwt() ->> ''email'') WITH CHECK (user_email = auth.jwt() ->> ''email'')';
    END IF;
END $$;

-- ============================================
-- ROLE CHANGE PROTECTION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION prevent_role_self_elevation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_profiles
            WHERE email = auth.jwt() ->> 'email'
            AND role = 'admin'
        ) THEN
            NEW.role := OLD.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_change_permission ON user_profiles;
CREATE TRIGGER enforce_role_change_permission
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_self_elevation();
