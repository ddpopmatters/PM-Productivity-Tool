-- ============================================
-- MULTI-OWNER PROJECTS
-- ============================================
-- Convert owner and owner_email from single TEXT to TEXT[] arrays.
-- Existing single-value data converts to single-element arrays.
-- RLS policies updated to use ANY() for array membership checks.

-- ============================================
-- 1. DROP EXISTING RLS POLICIES (must happen BEFORE column type change)
-- ============================================
-- From 006_fix_rls_policies.sql
DROP POLICY IF EXISTS "workflow_items_insert" ON workflow_items;
DROP POLICY IF EXISTS "workflow_items_update" ON workflow_items;
DROP POLICY IF EXISTS "workflow_items_delete" ON workflow_items;
-- From 014_fix_collaborator_rls.sql (may have replaced workflow_items_update)
DROP POLICY IF EXISTS "Owners and collaborators can update" ON workflow_items;

-- ============================================
-- 2. ALTER COLUMNS: TEXT → TEXT[]
-- ============================================
ALTER TABLE workflow_items
  ALTER COLUMN owner TYPE TEXT[]
  USING CASE
    WHEN owner IS NOT NULL AND owner != '' THEN ARRAY[owner]
    ELSE ARRAY[]::TEXT[]
  END;

ALTER TABLE workflow_items
  ALTER COLUMN owner_email TYPE TEXT[]
  USING CASE
    WHEN owner_email IS NOT NULL AND owner_email != '' THEN ARRAY[owner_email]
    ELSE ARRAY[]::TEXT[]
  END;

-- ============================================
-- 3. RECREATE RLS POLICIES WITH ANY() CHECKS
-- ============================================

-- SELECT stays the same (all authenticated can read)
-- Already exists from 006: "workflow_items_select"

CREATE POLICY "workflow_items_insert" ON workflow_items
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.jwt() ->> 'email' = ANY(owner_email)
        OR owner_email IS NULL
        OR array_length(owner_email, 1) IS NULL
    );

CREATE POLICY "workflow_items_update" ON workflow_items
    FOR UPDATE TO authenticated
    USING (
        auth.jwt() ->> 'email' = ANY(owner_email)
        OR is_collaborator(collaborators, auth.jwt() ->> 'email')
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    )
    WITH CHECK (
        auth.jwt() ->> 'email' = ANY(owner_email)
        OR is_collaborator(collaborators, auth.jwt() ->> 'email')
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

CREATE POLICY "workflow_items_delete" ON workflow_items
    FOR DELETE TO authenticated
    USING (
        auth.jwt() ->> 'email' = ANY(owner_email)
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin')
    );

-- ============================================
-- NOTES
-- ============================================
-- * Policies must be dropped BEFORE altering column types (PostgreSQL requirement)
-- * is_collaborator() function from 014 is unchanged (operates on collaborators, not owner_email)
-- * workflow_items_select policy is unchanged (all authenticated can read)
-- * Existing single-owner rows become single-element arrays via the USING clause
-- * Empty/null owners become empty arrays
