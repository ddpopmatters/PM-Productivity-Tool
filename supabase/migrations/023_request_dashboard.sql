-- Add page_url and status_history columns to landing_page_requests
ALTER TABLE landing_page_requests
  ADD COLUMN IF NOT EXISTS page_url text,
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb;
