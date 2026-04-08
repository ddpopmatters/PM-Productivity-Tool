CREATE TABLE IF NOT EXISTS telegram_sessions (
    chat_id BIGINT PRIMARY KEY,
    user_email TEXT NOT NULL,
    active_ws_id UUID REFERENCES workstreams(id) ON DELETE SET NULL,
    active_task_id UUID REFERENCES workstream_tasks(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_updated_at ON telegram_sessions;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON telegram_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
