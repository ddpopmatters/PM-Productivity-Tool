CREATE TABLE IF NOT EXISTS mindmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]',
  owner_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE mindmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mindmaps_owner" ON mindmaps FOR ALL USING (owner_email = current_setting('request.jwt.claims', true)::json->>'email');
CREATE INDEX idx_mindmaps_owner ON mindmaps(owner_email);
