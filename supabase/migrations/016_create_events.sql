-- Migration: Create events table for shared external events calendar
-- Events are date-only (no time), shared by default, with optional project/workstream linking

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    -- Date (no times — date-only events)
    event_date DATE NOT NULL,
    end_date DATE,  -- for multi-day events (e.g. 3-day conference), NULL = single day
    -- Ownership
    created_by TEXT NOT NULL,
    created_by_email TEXT NOT NULL,
    -- Display
    color TEXT DEFAULT 'ocean',
    category TEXT,  -- conference, media, campaign, publication, webinar, partner, other
    location TEXT,
    -- Optional linking
    linked_entry_id UUID,  -- link to workflow_items (project)
    linked_workstream_id UUID,  -- link to workstreams
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_date_range ON events(event_date, end_date);
CREATE INDEX idx_events_category ON events(category);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all events (shared by default)
CREATE POLICY "Authenticated users can view events" ON events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert events" ON events
    FOR INSERT WITH CHECK (created_by_email = auth.jwt()->>'email');

-- Anyone can update (team calendar, not personal)
CREATE POLICY "Authenticated users can update events" ON events
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Only creator can delete
CREATE POLICY "Creator can delete events" ON events
    FOR DELETE USING (created_by_email = auth.jwt()->>'email');

-- Auto-update updated_at (reuses function from migration 015)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
