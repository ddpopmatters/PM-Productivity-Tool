ALTER TABLE telegram_sessions
ADD COLUMN IF NOT EXISTS pending_action TEXT;
