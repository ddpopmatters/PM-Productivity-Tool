-- Migration: Workstream improvements
-- 1. Auto-update updated_at trigger for both workstream tables
-- 2. Restrict DELETE on shared workstream tasks to owner or assignee
-- 3. Add composite index for priority sorting within workstreams

-- 1. updated_at trigger function (reusable, create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to workstreams
DROP TRIGGER IF EXISTS set_updated_at ON workstreams;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON workstreams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to workstream_tasks
DROP TRIGGER IF EXISTS set_updated_at ON workstream_tasks;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON workstream_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Restrict DELETE on shared workstream tasks
-- Current policy: anyone who can see the workstream can delete any task
-- New policy: only the workstream owner or task assignee can delete
DROP POLICY IF EXISTS "Users can delete tasks in accessible workstreams" ON workstream_tasks;

CREATE POLICY "Users can delete own or assigned tasks" ON workstream_tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (
                w.owner_email = auth.jwt()->>'email'
                OR workstream_tasks.assignee_email = auth.jwt()->>'email'
            )
        )
    );

-- 3. Composite index for priority backlog sorting
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_priority_sort
    ON workstream_tasks(workstream_id, priority, sort_order);
