-- Fix: UPDATE policy on brain_dumps fails for Telegram-inserted rows
-- Telegram inserts via service key have user_id = NULL (no auth context).
-- Previous policy: auth.uid() = user_id → evaluates to NULL for NULL rows → silent fail.
-- Fix: allow authenticated users to update NULL-owner rows (single-user tool).

DROP POLICY IF EXISTS "Users can update own brain dumps" ON brain_dumps;

CREATE POLICY "Users can update own brain dumps" ON brain_dumps
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
        AND (auth.uid() = user_id OR user_id IS NULL)
    );
