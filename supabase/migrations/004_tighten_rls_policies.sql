-- ============================================
-- TIGHTEN RLS POLICIES
-- ============================================
-- This migration:
-- 1. Removes overly permissive "Allow all" policies
-- 2. Adds owner_email column for ownership tracking
-- 3. Restricts anon access (only authenticated can write)
-- ============================================

-- ============================================
-- WORKFLOW_ITEMS: Clean up and tighten
-- ============================================

-- Remove the overly permissive policies
DROP POLICY IF EXISTS "Allow all" ON workflow_items;
DROP POLICY IF EXISTS "Users can create own items" ON workflow_items;

-- Add owner_email column if it doesn't exist (for future ownership checks)
ALTER TABLE workflow_items
ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Create index for owner_email lookups
CREATE INDEX IF NOT EXISTS idx_workflow_items_owner_email ON workflow_items(owner_email);

-- ============================================
-- MANAGERS: Clean up
-- ============================================
DROP POLICY IF EXISTS "Allow all" ON managers;

-- Managers table: public read, authenticated write
CREATE POLICY "Anyone can read managers" ON managers
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated can modify managers" ON managers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated can update managers" ON managers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated can delete managers" ON managers
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- USER_PROFILES: Clean up
-- ============================================
DROP POLICY IF EXISTS "Allow insert for all" ON user_profiles;
DROP POLICY IF EXISTS "Allow update for all" ON user_profiles;

-- User profiles: public read, authenticated write
CREATE POLICY "Anyone can read profiles" ON user_profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated can insert profiles" ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated can update profiles" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- WORKSTREAMS: Clean up
-- ============================================
DROP POLICY IF EXISTS "Allow all access" ON workstreams;

-- Workstreams: public read, authenticated write
CREATE POLICY "Anyone can read workstreams" ON workstreams
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated can modify workstreams" ON workstreams
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- BLOCK ANONYMOUS WRITE ACCESS
-- ============================================
-- These ensure anon users cannot write to tables
-- (they can only read where SELECT policies allow)

-- Anon cannot write to workflow_items (RLS blocks by default when no policy matches)
-- Anon cannot write to managers
-- Anon cannot write to user_profiles
-- Anon cannot write to workstreams

-- ============================================
-- NOTES: For proper ownership-based RLS
-- ============================================
-- To fully resolve the warnings, you need Clerk + Supabase JWT integration:
--
-- 1. In Clerk Dashboard → JWT Templates → Create "supabase" template:
--    {
--      "aud": "authenticated",
--      "role": "authenticated",
--      "email": "{{user.primary_email_address}}"
--    }
--
-- 2. In Supabase Dashboard → Settings → API → JWT Secret:
--    Use your Clerk JWT signing key
--
-- 3. In your app, get Clerk token for Supabase:
--    const token = await clerk.session.getToken({ template: 'supabase' });
--    const supabase = createClient(URL, ANON_KEY, {
--      global: { headers: { Authorization: `Bearer ${token}` } }
--    });
--
-- 4. Then policies can use:
--    USING (owner_email = auth.jwt() ->> 'email')
--
-- See: https://clerk.com/docs/integrations/databases/supabase
