-- Migration: Add task_type to workstream_tasks
-- Allows categorizing tasks as Issue, Feature Request, Feature Improvement, or custom types

ALTER TABLE workstream_tasks
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Issue';

-- Create index for filtering by task type
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_type ON workstream_tasks(task_type);

COMMENT ON COLUMN workstream_tasks.task_type IS 'Type of task: Issue, Feature Request, Feature Improvement, or custom';
