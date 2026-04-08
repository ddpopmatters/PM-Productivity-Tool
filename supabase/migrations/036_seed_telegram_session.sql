-- Ensure telegram_sessions table exists (034 may have been recorded but not executed)
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

-- Seed telegram_sessions for the bot owner.
-- Looks up the most recent telegram_chat_id from brain_dumps.
-- Safe to re-run (ON CONFLICT DO UPDATE).
INSERT INTO telegram_sessions (chat_id, user_email)
SELECT telegram_chat_id, 'daniel.davis@populationmatters.org'
FROM brain_dumps
WHERE telegram_chat_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (chat_id) DO UPDATE SET user_email = EXCLUDED.user_email;
