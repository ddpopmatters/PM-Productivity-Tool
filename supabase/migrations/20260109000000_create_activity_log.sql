-- Create activity_log table for tracking all actions
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- What happened
    action_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed', 'comment_added', 'subtask_added', 'subtask_completed', 'assigned', 'role_changed'

    -- Who did it
    actor_email TEXT NOT NULL,
    actor_name TEXT,

    -- What was affected
    target_type TEXT NOT NULL, -- 'workflow_item', 'subtask', 'comment', 'user_profile'
    target_id TEXT, -- ID of the affected item
    target_title TEXT, -- Title/name for display

    -- Additional context
    details JSONB DEFAULT '{}', -- Flexible field for action-specific data (old_status, new_status, etc.)

    -- Related users (for notifications)
    related_users TEXT[] DEFAULT '{}', -- Array of emails who should be notified

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read activity (for activity feeds)
CREATE POLICY "Allow public read access" ON activity_log
    FOR SELECT USING (true);

-- Allow inserts for logging
CREATE POLICY "Allow insert for all" ON activity_log
    FOR INSERT WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_id ON activity_log(target_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_email ON activity_log(actor_email);
CREATE INDEX IF NOT EXISTS idx_activity_log_related_users ON activity_log USING GIN(related_users);
