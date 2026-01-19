-- Migration: Create Workstreams Feature
-- Adds workstreams and workstream_tasks tables for ongoing work management

-- Create workstreams table
CREATE TABLE IF NOT EXISTS workstreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal', 'shared')),
    color TEXT DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workstream_tasks table
CREATE TABLE IF NOT EXISTS workstream_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workstream_id UUID NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    sort_order INTEGER DEFAULT 0,
    deadline DATE,
    assignee TEXT,
    assignee_email TEXT,
    requester TEXT,
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
    linked_items UUID[] DEFAULT '{}',
    comments JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workstreams_owner ON workstreams(owner_email);
CREATE INDEX IF NOT EXISTS idx_workstreams_visibility ON workstreams(visibility);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_workstream ON workstream_tasks(workstream_id);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_assignee ON workstream_tasks(assignee_email);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_deadline ON workstream_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_priority ON workstream_tasks(priority);

-- Enable RLS
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstream_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workstreams
-- Users can see: their own personal workstreams OR any shared workstreams
CREATE POLICY "Users can view accessible workstreams" ON workstreams
    FOR SELECT USING (
        visibility = 'shared' OR owner_email = auth.jwt()->>'email'
    );

CREATE POLICY "Users can insert their own workstreams" ON workstreams
    FOR INSERT WITH CHECK (
        owner_email = auth.jwt()->>'email'
    );

CREATE POLICY "Owners can update their workstreams" ON workstreams
    FOR UPDATE USING (
        owner_email = auth.jwt()->>'email'
    );

CREATE POLICY "Owners can delete their workstreams" ON workstreams
    FOR DELETE USING (
        owner_email = auth.jwt()->>'email'
    );

-- RLS Policies for workstream_tasks
-- Users can see tasks in workstreams they have access to
CREATE POLICY "Users can view tasks in accessible workstreams" ON workstream_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Users can insert tasks in accessible workstreams
CREATE POLICY "Users can insert tasks in accessible workstreams" ON workstream_tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Users can update tasks in accessible workstreams
CREATE POLICY "Users can update tasks in accessible workstreams" ON workstream_tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Users can delete tasks in accessible workstreams
CREATE POLICY "Users can delete tasks in accessible workstreams" ON workstream_tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Comments
COMMENT ON TABLE workstreams IS 'Ongoing work buckets for managing iterative work';
COMMENT ON TABLE workstream_tasks IS 'Tasks within workstreams with priority and deadline tracking';
