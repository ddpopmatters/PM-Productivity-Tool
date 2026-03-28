-- Landing page request tables for Pages Hub feature
-- Roles are derived at application layer from isAdmin/isManager utils.
-- RLS: authenticated users read all; write scoped by requester_id.

-- ─── landing_page_requests ────────────────────────────────────────────────

CREATE TYPE landing_page_type AS ENUM ('appeal', 'evergreen', 'expedited');
CREATE TYPE landing_page_goal AS ENUM ('donate', 'signup', 'share', 'other');
CREATE TYPE landing_page_status AS ENUM (
  'submitted', 'needs_more_info', 'approved', 'in_progress',
  'revision_1', 'revision_2', 'live', 'archived'
);
CREATE TYPE asset_readiness AS ENUM ('attached', 'owner_pending');
CREATE TYPE amendment_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE feedback_type AS ENUM ('content_change', 'copy_edit', 'broken_element');

CREATE TABLE IF NOT EXISTS landing_page_requests (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at               TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Requester (maps to auth.uid())
  requester_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_email          TEXT NOT NULL,

  -- Brief
  title                    TEXT NOT NULL,
  page_type                landing_page_type NOT NULL,
  page_goal                landing_page_goal NOT NULL,
  audience                 TEXT NOT NULL,

  -- Assets
  copy_status              asset_readiness NOT NULL DEFAULT 'attached',
  copy_owner               TEXT,
  copy_due_date            DATE,
  asset_status             asset_readiness NOT NULL DEFAULT 'attached',
  asset_owner              TEXT,
  asset_due_date           DATE,

  -- Scheduling
  go_live_date             DATE NOT NULL,
  expedited_justification  TEXT,

  -- Governance
  named_approver           TEXT NOT NULL,
  revision_rounds_agreed   SMALLINT NOT NULL DEFAULT 2 CHECK (revision_rounds_agreed IN (2, 3)),
  extended_rounds_reason   TEXT,

  -- State
  status                   landing_page_status NOT NULL DEFAULT 'submitted',
  brief_locked_at          TIMESTAMPTZ,
  builder_notes            TEXT
);

CREATE INDEX idx_lpr_requester_id ON landing_page_requests(requester_id);
CREATE INDEX idx_lpr_status       ON landing_page_requests(status);
CREATE INDEX idx_lpr_go_live_date ON landing_page_requests(go_live_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lpr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lpr_updated_at
  BEFORE UPDATE ON landing_page_requests
  FOR EACH ROW EXECUTE FUNCTION update_lpr_updated_at();

-- RLS
ALTER TABLE landing_page_requests ENABLE ROW LEVEL SECURITY;

-- Builders / approvers (admins + managers) see all
-- Requesters see only their own
-- We can't call JS isAdmin here, so use a simple authenticated-read policy;
-- row-level filtering for requesters is enforced at application layer.
-- All authenticated PM staff can read all requests (internal tool).
CREATE POLICY "lpr_select_authenticated"
  ON landing_page_requests FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can insert their own request
CREATE POLICY "lpr_insert_own"
  ON landing_page_requests FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Requester can update their own (for needs_more_info edits).
-- Builders update via service role (status transitions, builder_notes).
CREATE POLICY "lpr_update_own"
  ON landing_page_requests FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid());

-- No hard delete for requesters — archive only. Service role used for admin deletes.

-- ─── revision_feedback ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS revision_feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  request_id    UUID NOT NULL REFERENCES landing_page_requests(id) ON DELETE CASCADE,
  round_number  SMALLINT NOT NULL CHECK (round_number IN (1, 2)),
  feedback_type feedback_type NOT NULL,
  description   TEXT NOT NULL,
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason   TEXT,
  created_by    UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX idx_rf_request_id ON revision_feedback(request_id);

ALTER TABLE revision_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rf_select_authenticated"
  ON revision_feedback FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "rf_insert_own"
  ON revision_feedback FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "rf_update_own"
  ON revision_feedback FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- ─── amendments ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS amendments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at   TIMESTAMPTZ,
  request_id    UUID NOT NULL REFERENCES landing_page_requests(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES auth.users(id),
  justification TEXT NOT NULL,
  status        amendment_status NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_amend_request_id ON amendments(request_id);
CREATE INDEX idx_amend_status     ON amendments(status);

ALTER TABLE amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amend_select_authenticated"
  ON amendments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "amend_insert_own"
  ON amendments FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Builders resolve amendments — also enforced at app layer
CREATE POLICY "amend_update_authenticated"
  ON amendments FOR UPDATE
  TO authenticated
  USING (true);
