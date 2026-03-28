ALTER TABLE landing_page_requests
  ADD COLUMN IF NOT EXISTS key_messages text,
  ADD COLUMN IF NOT EXISTS price_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS copy_tone text,
  ADD COLUMN IF NOT EXISTS suggested_headline text,
  ADD COLUMN IF NOT EXISTS cta_copy text;
