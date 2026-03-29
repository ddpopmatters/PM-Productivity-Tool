-- Website Sitemap Planner
-- Adds: website_sitemap_nodes (self-referencing tree, max 3 levels enforced in app)

CREATE TABLE IF NOT EXISTS website_sitemap_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES website_project(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES website_sitemap_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  page_type TEXT NOT NULL DEFAULT 'content'
    CHECK (page_type IN ('content', 'form', 'redirect', 'external')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'live')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  linked_page_id UUID REFERENCES website_pages(id) ON DELETE SET NULL,
  notes TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sitemap_nodes_project ON website_sitemap_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_sitemap_nodes_parent ON website_sitemap_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_sitemap_nodes_order ON website_sitemap_nodes(project_id, parent_id, sort_order ASC);

DROP TRIGGER IF EXISTS trg_website_sitemap_nodes_updated ON website_sitemap_nodes;
CREATE TRIGGER trg_website_sitemap_nodes_updated
  BEFORE UPDATE ON website_sitemap_nodes
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

ALTER TABLE website_sitemap_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read website_sitemap_nodes"
  ON website_sitemap_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_sitemap_nodes"
  ON website_sitemap_nodes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_sitemap_nodes"
  ON website_sitemap_nodes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete website_sitemap_nodes"
  ON website_sitemap_nodes FOR DELETE TO authenticated USING (true);
