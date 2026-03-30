-- Store Telegram context on brain_dump rows so the bot can identify which
-- dump a callback_query relates to without embedding IDs in button data.

ALTER TABLE brain_dumps
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_brain_dumps_telegram
  ON brain_dumps(telegram_chat_id, telegram_message_id)
  WHERE telegram_chat_id IS NOT NULL;
