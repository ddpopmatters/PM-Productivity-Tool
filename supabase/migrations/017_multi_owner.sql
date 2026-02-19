-- ============================================
-- MULTI-OWNER PROJECTS
-- ============================================
-- Convert owner and owner_email from single TEXT to TEXT[] arrays.
-- Existing single-value data converts to single-element arrays.
-- RLS policies updated to use ANY() for array membership checks.

-- ============================================
-- 1. DROP ALL RLS POLICIES ON workflow_items (must happen BEFORE column type change)
-- ============================================
-- Dynamic drop: removes EVERY policy on the table regardless of name.
-- This handles partial previous runs that may have left policies behind.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'workflow_items' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON workflow_items', pol.policyname);
  END LOOP;
END
$$;

-- ============================================
-- 2. ALTER COLUMNS: TEXT → TEXT[] (idempotent — skips if already arrays)
-- ============================================
DO $$
BEGIN
  -- Only alter owner if it's not already an array type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workflow_items'
      AND column_name = 'owner' AND data_type = 'text'
  ) THEN
    ALTER TABLE workflow_items
      ALTER COLUMN owner TYPE TEXT[]
      USING CASE
        WHEN owner IS NOT NULL AND owner != '' THEN ARRAY[owner]
        ELSE ARRAY[]::TEXT[]
      END;
  END IF;

  -- Only alter owner_email if it's not already an array type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workflow_items'
      AND column_name = 'owner_email' AND data_type = 'text'
  ) THEN
    ALTER TABLE workflow_items
      ALTER COLUMN owner_email TYPE TEXT[]
      USING CASE
        WHEN owner_email IS NOT NULL AND owner_email != '' THEN ARRAY[owner_email]
        ELSE ARRAY[]::TEXT[]
      END;
  END IF;
END
$$;

-- ============================================
-- 3. RECREATE RLS POLICIES WITH ANY() CHECKS
-- ============================================

-- SELECT: all authenticated can read (recreated because DO block drops everything)
CREATE POLICY "workflow_items_select" ON workflow_items
    FOR SELECT TO authenticated
    USING (true);

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
