-- ============================================
-- MULTI-OWNER PROJECTS
-- ============================================
-- Convert owner and owner_email from single TEXT to TEXT[] arrays.
-- Existing single-value data converts to single-element arrays.
-- RLS policies updated to use ANY() for array membership checks.
--
-- IMPORTANT: Run this as TWO separate executions in the Supabase SQL editor.
-- Copy everything from "-- STEP 1" to "-- END STEP 1" first, run it.
-- Then copy everything from "-- STEP 2" to the end, run it.

-- ============================================
-- STEP 1: Drop all policies and alter columns
-- ============================================
-- Run this block FIRST in the Supabase SQL editor.
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Dynamically drop EVERY policy on workflow_items
  FOR pol IN
    SELECT p.polname
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON p.polrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'workflow_items' AND n.nspname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workflow_items', pol.polname);
  END LOOP;

  -- Alter owner column if still TEXT
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

  -- Alter owner_email column if still TEXT
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
-- END STEP 1

-- ============================================
-- STEP 2: Recreate RLS policies with ANY() checks
-- ============================================
-- Run this block SECOND in the Supabase SQL editor.

-- Ensure is_collaborator function exists (from 014, may not have been applied)
CREATE OR REPLACE FUNCTION is_collaborator(collaborators_array TEXT[], user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_name TEXT;
BEGIN
    SELECT name INTO user_name
    FROM user_profiles
    WHERE email = user_email
    LIMIT 1;

    IF user_name IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN user_name = ANY(collaborators_array);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
