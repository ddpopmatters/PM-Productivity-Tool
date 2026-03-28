CREATE TABLE IF NOT EXISTS request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES landing_page_requests(id) ON DELETE CASCADE,
  author_id uuid,
  author_email text NOT NULL,
  author_name text,
  body text NOT NULL,
  mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments(request_id);

ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON request_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
