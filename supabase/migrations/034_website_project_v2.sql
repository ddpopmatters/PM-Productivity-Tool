-- Website Project Management v2
-- Adds: page inventory fields, content status tracks, templates, dependencies, decisions

-- Extend website_pages with inventory and content status fields
ALTER TABLE website_pages
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS sub_section TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cms_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (cms_status IN ('not_started', 'created', 'published')),
  ADD COLUMN IF NOT EXISTS content_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (content_status IN ('not_started', 'drafted', 'approved')),
  ADD COLUMN IF NOT EXISTS design_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (design_status IN ('not_started', 'in_review', 'signed_off')),
  ADD COLUMN IF NOT EXISTS content_approval_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (content_approval_status IN ('not_started', 'submitted', 'approved')),
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS page_notes TEXT;

-- Bespoke template tracker
CREATE TABLE IF NOT EXISTS website_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES website_project(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  developer_notes TEXT,
  design_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (design_status IN ('not_started', 'in_review', 'signed_off')),
  build_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (build_status IN ('not_started', 'in_progress', 'complete')),
  flagged_for_early_signoff BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from website_pages.template_id to website_templates
ALTER TABLE website_pages
  ADD CONSTRAINT fk_website_pages_template
  FOREIGN KEY (template_id) REFERENCES website_templates(id) ON DELETE SET NULL;

-- Page dependency relationships (join table, bidirectional queryable)
CREATE TABLE IF NOT EXISTS website_page_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  depends_on_page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'references'
    CHECK (relationship_type IN ('references', 'feeds_into')),
  notes TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id, depends_on_page_id)
);

-- TBC / decisions log
CREATE TABLE IF NOT EXISTS website_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES website_project(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_email TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'decided', 'deferred')),
  outcome TEXT,
  related_page_ids UUID[] DEFAULT '{}',
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_pages_section ON website_pages(section);
CREATE INDEX IF NOT EXISTS idx_website_pages_section_order ON website_pages(section, sub_section, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_website_templates_project ON website_templates(project_id);
CREATE INDEX IF NOT EXISTS idx_website_page_deps_page ON website_page_dependencies(page_id);
CREATE INDEX IF NOT EXISTS idx_website_page_deps_depends_on ON website_page_dependencies(depends_on_page_id);
CREATE INDEX IF NOT EXISTS idx_website_decisions_project ON website_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_website_decisions_status ON website_decisions(status);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_website_templates_updated ON website_templates;
CREATE TRIGGER trg_website_templates_updated
  BEFORE UPDATE ON website_templates
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

DROP TRIGGER IF EXISTS trg_website_decisions_updated ON website_decisions;
CREATE TRIGGER trg_website_decisions_updated
  BEFORE UPDATE ON website_decisions
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

-- RLS
ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_page_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read website_templates"
  ON website_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_templates"
  ON website_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_templates"
  ON website_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete website_templates"
  ON website_templates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read website_page_dependencies"
  ON website_page_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_page_dependencies"
  ON website_page_dependencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete website_page_dependencies"
  ON website_page_dependencies FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read website_decisions"
  ON website_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_decisions"
  ON website_decisions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_decisions"
  ON website_decisions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete website_decisions"
  ON website_decisions FOR DELETE TO authenticated USING (true);
