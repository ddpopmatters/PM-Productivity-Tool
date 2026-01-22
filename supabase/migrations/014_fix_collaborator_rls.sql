-- ============================================
-- FIX COLLABORATOR RLS POLICY
-- ============================================
-- Previous policy used ILIKE pattern matching on collaborators array,
-- which had two issues:
-- 1. Collaborators stores names, but policy checked against email
-- 2. ILIKE '%email%' could match partial strings (e.g., a@b.com matches aa@b.com)
--
-- This migration fixes the policy to properly check if the user's name
-- (looked up from user_profiles) is in the collaborators array.

-- Drop the existing flawed policies
DROP POLICY IF EXISTS "Owners and collaborators can update" ON workflow_items;

-- Create a function to check if user is a collaborator
-- This looks up the user's name from their email and checks the array
CREATE OR REPLACE FUNCTION is_collaborator(collaborators_array TEXT[], user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get the user's display name from their profile
    SELECT name INTO user_name
    FROM user_profiles
    WHERE email = user_email
    LIMIT 1;

    -- If no profile found, user cannot be a collaborator
    IF user_name IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if the user's name is in the collaborators array (exact match)
    RETURN user_name = ANY(collaborators_array);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate the update policy with proper collaborator check
CREATE POLICY "Owners and collaborators can update" ON workflow_items
    FOR UPDATE
    TO authenticated
    USING (
        -- Owner can always update
        owner_email = auth.jwt() ->> 'email'
        -- Check if user is a collaborator (by name lookup)
        OR is_collaborator(collaborators, auth.jwt() ->> 'email')
    )
    WITH CHECK (
        owner_email = auth.jwt() ->> 'email'
        OR is_collaborator(collaborators, auth.jwt() ->> 'email')
    );

-- ============================================
-- COMMENTS
-- ============================================
-- Security improvements:
-- 1. Uses exact array containment (= ANY) instead of ILIKE pattern matching
-- 2. Properly looks up user name from email via user_profiles
-- 3. Returns FALSE if no profile found (fail secure)
-- 4. Function is SECURITY DEFINER to access user_profiles
-- 5. Function is STABLE for query optimization
