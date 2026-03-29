-- Website Project Management
-- Tracks website builds through phases, per-page RACI, and post-launch management

-- Main project
CREATE TABLE IF NOT EXISTS website_project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'in_progress', 'launched', 'archived')),
    lead_email TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed phases seeded on project creation
CREATE TABLE IF NOT EXISTS website_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES website_project(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (name IN ('Discovery', 'Design', 'Build', 'QA', 'Launch')),
    phase_order INTEGER NOT NULL CHECK (phase_order BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'complete')),
    approval_submitted_by TEXT,
    approval_submitted_at TIMESTAMPTZ,
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks within phases
CREATE TABLE IF NOT EXISTS website_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES website_project(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES website_phases(id) ON DELETE CASCADE,
    page_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    assignee_email TEXT,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
    created_by_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages: first-class entities, defined early, persist post-launch
CREATE TABLE IF NOT EXISTS website_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES website_project(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    owner_email TEXT,
    editor_email TEXT,
    reviewer_email TEXT,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_review', 'live', 'needs_update')),
    review_interval_days INTEGER NOT NULL DEFAULT 180,
    next_review_due DATE,
    last_reviewed_at TIMESTAMPTZ,
    last_review_note TEXT,
    created_by_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_website_tasks_page'
    ) THEN
        ALTER TABLE website_tasks
            ADD CONSTRAINT fk_website_tasks_page
            FOREIGN KEY (page_id) REFERENCES website_pages(id) ON DELETE SET NULL;
    END IF;
END;
$$;

-- Post-launch change requests
CREATE TABLE IF NOT EXISTS website_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES website_project(id) ON DELETE CASCADE,
    page_id UUID REFERENCES website_pages(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    requested_by_email TEXT NOT NULL,
    assignee_email TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_phases_project ON website_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_website_phases_order ON website_phases(project_id, phase_order ASC);
CREATE INDEX IF NOT EXISTS idx_website_tasks_phase ON website_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_website_tasks_project ON website_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_website_tasks_assignee ON website_tasks(assignee_email);
CREATE INDEX IF NOT EXISTS idx_website_pages_project ON website_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_review ON website_pages(next_review_due ASC);
CREATE INDEX IF NOT EXISTS idx_website_change_requests_project ON website_change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_website_change_requests_status ON website_change_requests(status);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_website_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_website_project_updated ON website_project;
CREATE TRIGGER trg_website_project_updated
    BEFORE UPDATE ON website_project
    FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

DROP TRIGGER IF EXISTS trg_website_phases_updated ON website_phases;
CREATE TRIGGER trg_website_phases_updated
    BEFORE UPDATE ON website_phases
    FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

DROP TRIGGER IF EXISTS trg_website_tasks_updated ON website_tasks;
CREATE TRIGGER trg_website_tasks_updated
    BEFORE UPDATE ON website_tasks
    FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

DROP TRIGGER IF EXISTS trg_website_pages_updated ON website_pages;
CREATE TRIGGER trg_website_pages_updated
    BEFORE UPDATE ON website_pages
    FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

DROP TRIGGER IF EXISTS trg_website_change_requests_updated ON website_change_requests;
CREATE TRIGGER trg_website_change_requests_updated
    BEFORE UPDATE ON website_change_requests
    FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

-- RLS
ALTER TABLE website_project ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read website_project"
    ON website_project FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_project"
    ON website_project FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_project"
    ON website_project FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read website_phases"
    ON website_phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_phases"
    ON website_phases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_phases"
    ON website_phases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read website_tasks"
    ON website_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_tasks"
    ON website_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_tasks"
    ON website_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete website_tasks"
    ON website_tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read website_pages"
    ON website_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_pages"
    ON website_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_pages"
    ON website_pages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete website_pages"
    ON website_pages FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read website_change_requests"
    ON website_change_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert website_change_requests"
    ON website_change_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update website_change_requests"
    ON website_change_requests FOR UPDATE TO authenticated USING (true);
