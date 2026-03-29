-- Allow any authenticated user to update landing_page_requests.
-- The previous policy restricted UPDATE to the row's requester_id,
-- which blocked builders and approvers from advancing request status.
-- This is an internal tool — all authenticated users are trusted PM staff.

DROP POLICY IF EXISTS "lpr_update_own" ON landing_page_requests;

CREATE POLICY "lpr_update_authenticated"
  ON landing_page_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
