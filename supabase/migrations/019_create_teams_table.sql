-- Create teams table for dynamic team management
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read teams
CREATE POLICY "teams_select" ON teams FOR SELECT TO authenticated USING (true);

-- Only admins can insert teams
CREATE POLICY "teams_insert" ON teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin'));

-- Only admins can update teams
CREATE POLICY "teams_update" ON teams FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin'));

-- Only admins can delete teams
CREATE POLICY "teams_delete" ON teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.jwt() ->> 'email' AND role = 'admin'));

-- Seed with existing teams from config
INSERT INTO teams (name) VALUES
  ('Advocacy & Influence'),
  ('Fundraising'),
  ('Research'),
  ('Operations'),
  ('Communications')
ON CONFLICT (name) DO NOTHING;
