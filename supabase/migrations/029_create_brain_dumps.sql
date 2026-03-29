-- Migration: Create brain_dumps table
-- Inbox layer for ideation-to-execution pathway.
-- Captures raw ideas from Telegram (text + photo OCR) and manual entry.
-- Items are triaged via AI into workstream tasks, parking lot, or archived.

CREATE TABLE IF NOT EXISTS brain_dumps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nullable: Telegram inserts via service key have no user context (single-user tool)
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Content
    content         TEXT NOT NULL,
    maturity        TEXT NOT NULL DEFAULT 'raw'
                        CHECK (maturity IN ('raw', 'forming', 'ready')),
    tags            TEXT[] DEFAULT '{}',

    -- Provenance
    source          TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual', 'telegram', 'telegram_photo')),

    -- Lifecycle
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'assessed', 'routed', 'archived')),
    assessed_at     TIMESTAMPTZ,
    routed_at       TIMESTAMPTZ,

    -- AI triage output
    -- Shape: { destination: 'workstream_task'|'parking_lot'|'archive',
    --          project: string, confidence: float, reasoning: string }
    assessment_json JSONB DEFAULT '{}',

    -- Where this dump was routed to (if routed)
    routed_to_type  TEXT CHECK (routed_to_type IN ('workstream_task', 'parking_lot', 'archive')),
    routed_to_id    UUID, -- workstream_tasks.id when routed_to_type = 'workstream_task'

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brain_dumps_user_id     ON brain_dumps(user_id);
CREATE INDEX idx_brain_dumps_status      ON brain_dumps(status);
CREATE INDEX idx_brain_dumps_source      ON brain_dumps(source);
CREATE INDEX idx_brain_dumps_created_at  ON brain_dumps(created_at DESC);

-- RLS — scoped to authenticated user's own rows only
ALTER TABLE brain_dumps ENABLE ROW LEVEL SECURITY;

-- Single-user tool: any authenticated user can see all rows (includes NULL user_id from Telegram)
CREATE POLICY "Users can view own brain dumps" ON brain_dumps
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated inserts set user_id; service-key inserts (Telegram) bypass RLS entirely
CREATE POLICY "Users can insert own brain dumps" ON brain_dumps
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own brain dumps" ON brain_dumps
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brain dumps" ON brain_dumps
    FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE brain_dumps IS 'Ideation inbox — raw captures from Telegram and manual entry, triaged into workstream tasks';
COMMENT ON COLUMN brain_dumps.assessment_json IS 'AI triage output: {destination, project, confidence, reasoning}';
COMMENT ON COLUMN brain_dumps.routed_to_id IS 'FK to workstream_tasks.id when routed_to_type = workstream_task';
