-- Add pending_data JSONB column to telegram_sessions for LLM task confirm flow
ALTER TABLE telegram_sessions
  ADD COLUMN IF NOT EXISTS pending_data JSONB;
