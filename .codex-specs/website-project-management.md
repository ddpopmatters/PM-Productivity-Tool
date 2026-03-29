# Codex Spec: Website Project Management (PM-Productivity-Tool)

## Task
Add a Website Project Management feature to the PM Productivity Tool (Momentum Hub). This tracks a website build through fixed phases, manages per-page RACI ownership, and transitions to an ongoing page registry post-launch.

---

## Context

### Files to read before writing any code
- `supabase/migrations/011_create_workstreams.sql` — migration pattern (UUID PKs, gen_random_uuid(), TIMESTAMPTZ, CHECK constraints, RLS pattern)
- `supabase/migrations/015_workstream_improvements.sql` — RLS policy pattern to follow exactly
- `src/services/workflowItems.js` — service layer pattern (getSupabase(), transform, error handling)
- `src/services/workstreams.js` — closest existing service pattern for project+task relationship
- `src/hooks/useWorkstreams.js` — hook pattern wrapping a service
- `src/components/features/workstreams/WorkstreamView.jsx` — closest existing component pattern (project + task list, inline forms)
- `src/App.jsx` — understand the `renderView()` switch and how to add a new view
- `src/utils/config.js` — constants pattern; understand APP_CONFIG, USERS
- `src/components/ui/Badge.jsx` and `Button.jsx` — reusable UI primitives to use
- `src/api/supabase.js` — getSupabase() function

### Do not modify
- Any existing migration files (001–029 and the activity_log migration)
- `src/contexts/AppContext.jsx` — read-only (use useApp() hook to access auth state)
- `.env` — never read or write
- `src/utils/config.js` — read-only

### Project conventions
- **Language**: JavaScript (JSX) — no TypeScript, no .ts files
- **Component files**: PascalCase `.jsx`
- **Service files**: camelCase `.js` in `src/services/`
- **Hook files**: camelCase `useXxx.js` in `src/hooks/`
- **No TypeScript**: no interfaces, no type annotations
- **Tailwind CSS**: all styling via Tailwind utility classes
- **Icons**: Lucide React — import named icons from `lucide-react`
- **Supabase**: all DB ops via `getSupabase()` from `src/api/supabase.js`
- **Error handling**: silent (log via `Logger.error()`, return [] or null on failure)
- **UUID**: database generates via `gen_random_uuid()` — never generate in JS
- **RLS**: every table needs RLS enabled + policies

---

## Requirements

### 1. Database Migration

Create `supabase/migrations/030_create_website_project.sql`:

```sql
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
  approval_submitted_by TEXT,   -- email; set when phase submitted for sign-off
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
  page_id UUID,  -- FK to website_pages added below after table creation
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
  owner_email TEXT,    -- Accountable
  editor_email TEXT,   -- Responsible
  reviewer_email TEXT, -- Consulted
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

-- Add FK from website_tasks.page_id to website_pages now that table exists
ALTER TABLE website_tasks
  ADD CONSTRAINT fk_website_tasks_page
  FOREIGN KEY (page_id) REFERENCES website_pages(id) ON DELETE SET NULL;

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

-- updated_at triggers (follow pattern from existing migrations)
CREATE OR REPLACE FUNCTION update_website_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_website_project_updated
  BEFORE UPDATE ON website_project
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

CREATE TRIGGER trg_website_phases_updated
  BEFORE UPDATE ON website_phases
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

CREATE TRIGGER trg_website_tasks_updated
  BEFORE UPDATE ON website_tasks
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

CREATE TRIGGER trg_website_pages_updated
  BEFORE UPDATE ON website_pages
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

CREATE TRIGGER trg_website_change_requests_updated
  BEFORE UPDATE ON website_change_requests
  FOR EACH ROW EXECUTE FUNCTION update_website_updated_at();

-- RLS: enable on all tables
ALTER TABLE website_project ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies: all authenticated users can read; authenticated users can write
-- (Role-based restrictions enforced in application layer via isAdmin())
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
```

### 2. Service Layer

Create `src/services/websiteProject.js`:

Follow `src/services/workstreams.js` exactly for:
- `getSupabase()` import
- `Logger.error()` on all errors
- Return `[]` or `null` on failure, never throw
- No transformation needed (keep snake_case from DB, components handle display)

Functions to implement:

```javascript
// Projects
fetchWebsiteProject()         // SELECT single non-archived project, order by created_at DESC LIMIT 1
createWebsiteProject(data)    // INSERT + seed 5 phases in sequence
updateWebsiteProject(id, updates)  // UPDATE project fields
launchProject(id)             // UPDATE status='launched', set all draft pages to live+next_review_due
archiveProject(id)            // UPDATE status='archived'

// Phases
fetchWebsitePhases(projectId)      // SELECT all phases ORDER BY phase_order ASC
updatePhaseStatus(id, status)      // UPDATE phase status
submitPhaseForApproval(id, email)  // UPDATE approval_submitted_by, approval_submitted_at, approval_status='pending'
reviewPhaseApproval(id, status, comment)  // UPDATE approval_status + approval_comment

// Tasks
fetchPhaseTasks(phaseId)           // SELECT tasks for phase ORDER BY due_date ASC NULLS LAST
fetchMyTasks(projectId, userEmail) // SELECT tasks assigned to userEmail, status != 'done'
createTask(data)                   // INSERT
updateTask(id, updates)            // UPDATE
deleteTask(id)                     // DELETE

// Pages
fetchWebsitePages(projectId)       // SELECT all pages ORDER BY name ASC
createPage(data)                   // INSERT
updatePage(id, updates)            // UPDATE
deletePage(id)                     // DELETE — first check no tasks reference it, return error if so
markPageReviewed(id, note)         // UPDATE last_reviewed_at=now(), last_review_note, next_review_due=(now + interval), status='live' if was 'needs_update'

// Change requests
fetchChangeRequests(projectId, statusFilter)  // SELECT, optional WHERE status=statusFilter
createChangeRequest(data)                      // INSERT
updateChangeRequest(id, updates)               // UPDATE
```

For `createWebsiteProject(data)`:
- INSERT the project row
- Then INSERT 5 phase rows in order: Discovery(1), Design(2), Build(3), QA(4), Launch(5)
- Use Promise.all for the 5 phase inserts
- Return the created project

For `launchProject(id)`:
- Verify Launch phase has status='complete' — if not, return `{ error: 'Launch phase must be complete before launching' }`
- UPDATE project status='launched'
- UPDATE all website_pages where project_id=id and status='draft': set status='live', next_review_due=NOW() + INTERVAL '180 days' (or use review_interval_days)
- Return updated project

For `markPageReviewed(id, note)`:
- Fetch current page to get review_interval_days
- UPDATE last_reviewed_at=NOW(), last_review_note=note, next_review_due=(NOW() + review_interval_days days)
- If current status='needs_update', set status='live'
- Return updated page

### 3. Custom Hook

Create `src/hooks/useWebsiteProject.js`:

Follow `src/hooks/useWorkstreams.js` pattern:
- Import all service functions from `src/services/websiteProject.js`
- Import `useApp` from `src/contexts/AppContext.jsx` for `userEmail`, `currentUser`
- Import `isAdmin` from `src/utils/auth.js` for admin checks

State to manage:
```javascript
const [project, setProject] = useState(null);
const [phases, setPhases] = useState([]);
const [tasks, setTasks] = useState({});       // keyed by phase_id: { [phaseId]: task[] }
const [pages, setPages] = useState([]);
const [changeRequests, setChangeRequests] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

Functions to expose:
- `loadProject()` — fetches project, then phases, pages in parallel; sets all state
- `handleCreateProject(data)` — calls createWebsiteProject, reloads
- `handleUpdateProject(id, updates)` — optimistic update, then save
- `handleLaunchProject(id)` — calls launchProject, handles error response, reloads
- `handleArchiveProject(id)` — calls archiveProject, reloads
- `handleUpdatePhase(id, status)` — calls updatePhaseStatus, updates phases state
- `handleSubmitPhaseApproval(id)` — calls submitPhaseForApproval with userEmail
- `handleReviewPhaseApproval(id, status, comment)` — calls reviewPhaseApproval
- `loadPhaseTasks(phaseId)` — fetches tasks for one phase, merges into tasks state
- `handleCreateTask(data)` — creates task, reloads that phase's tasks
- `handleUpdateTask(id, updates)` — optimistic update on tasks state
- `handleDeleteTask(id, phaseId)` — deletes, removes from tasks state
- `handleCreatePage(data)` — creates page, reloads pages
- `handleUpdatePage(id, updates)` — optimistic update on pages
- `handleDeletePage(id)` — deletes (service handles constraint check), reloads
- `handleMarkPageReviewed(id, note)` — calls markPageReviewed, updates pages state
- `loadChangeRequests(statusFilter)` — fetches change requests
- `handleCreateChangeRequest(data)` — creates, reloads change requests
- `handleUpdateChangeRequest(id, updates)` — optimistic update

Call `loadProject()` inside `useEffect` on mount.

Return all state + all handlers + `isAdminUser: isAdmin(userEmail)`.

### 4. React Components

Create `src/components/features/website/` directory with these files:

#### `WebsiteView.jsx`
Top-level component. Receives `websiteHook` prop (the return value of `useWebsiteProject()`).
- If loading: show `<LoadingSpinner />`
- If no project and isAdminUser: show empty state — "No website project yet" + "Create Project" button that opens inline create form (name, description, lead_email fields)
- If project.status is `planning` or `in_progress`: render `<BuildView />`
- If project.status is `launched`: render `<OngoingView />`
- If project.status is `archived`: show archived banner + "Start New Project" button (admin only)

#### `BuildView.jsx`
Props: `{ project, phases, tasks, pages, isAdminUser, handlers }`
- Header: project name, status badge, lead email, overall % complete (all tasks done / total tasks)
- Admin bar: "Mark as Launched" button — disabled with tooltip if Launch phase not complete, else opens confirm dialogue (window.confirm — acceptable here since it's admin-only and not in a loop)
- Renders `<PhaseAccordion />` for each phase in order

#### `PhaseAccordion.jsx`
Props: `{ phase, tasks, pages, isAdminUser, onLoadTasks, handlers }`
- Call `onLoadTasks(phase.id)` in useEffect on mount to fetch tasks for this phase
- Collapsed header: phase name, `N/total done` progress, status badge, chevron icon
- Expanded: `<TaskList />` + "Add task" inline form (below list) + admin approval section
- Approval section (admin only): if no approval pending → "Submit for approval" button; if pending → "Pending approval" badge + Approve/Reject buttons + comment input
- Status badge: not_started=grey, in_progress=blue, complete=green — use Tailwind bg colours
- Auto-expand if phase has status='in_progress'

#### `TaskList.jsx`
Props: `{ tasks, pages, isAdminUser, phaseId, onCreateTask, onUpdateTask, onDeleteTask }`
- Each task row: title, assignee_email (show just first name or full email), due_date (red if overdue + status != done), status select (inline change), page badge if page_id set, delete button (admin only)
- Status select options: todo, in_progress, done, blocked — with colour indicators
- "Add task" form below list (not modal): title input (required), assignee email, due date, page selector (dropdown of pages)
- Empty state: "No tasks yet — add the first one"

#### `PageRegistry.jsx`
Props: `{ pages, isAdminUser, handlers }`
- Table: Page name | Slug | Owner | Editor | Reviewer | Status | Next Review Due | Actions
- Status badge: draft=grey, in_review=blue, live=green, needs_update=amber
- Review due date: amber if ≤30 days, red if overdue
- Actions: Edit (opens inline form), "Mark Reviewed" button, Delete (admin, confirm first)
- "Add page" form (admin, inline above table or at bottom): name, slug, description, owner/editor/reviewer emails, review interval
- "Mark Reviewed" opens a small inline note input then submits

#### `ChangeRequestList.jsx`
Props: `{ changeRequests, pages, isAdminUser, userEmail, onLoad, onCreateChangeRequest, onUpdateChangeRequest }`
- Filter tabs: All | Open | In Progress | Done
- Call `onLoad(activeFilter)` in useEffect when filter changes
- Each row: priority badge (high=red, medium=amber, low=grey), title, page name (if linked), requested by, assignee, status badge, approval badge if approval_required
- "Raise change request" button (any user) — inline form: title, description, page selector (optional), priority, approval_required toggle (admin only)
- Admin: assign button, approve/reject if approval pending

#### `OngoingView.jsx`
Props: `{ project, pages, changeRequests, isAdminUser, handlers }`
- Header: project name, "Live" green badge
- Two sections: `<PageRegistry />` (top) + `<ChangeRequestList />` (bottom)
- Admin: "Archive Project" button with confirm

### 5. App.jsx Integration

In `src/App.jsx`:
- Import `useWebsiteProject` from `./hooks/useWebsiteProject`
- Import `WebsiteView` from `./components/features/website/WebsiteView`
- Add `const websiteHook = useWebsiteProject();` near the other hooks at the top
- In `renderView()` switch, add case `'website'`: `return <WebsiteView websiteHook={websiteHook} />;`
- In the Sidebar component props (or wherever nav items are defined), add "Website" nav item with icon `Globe` from lucide-react, view name `'website'`
- Position it after the "Workstreams" nav item

### 6. Sidebar Nav Item

Find where nav items are defined (likely `src/components/features/navigation/Sidebar.jsx` or in `src/utils/config.js`). Add:
```javascript
{ id: 'website', label: 'Website', icon: Globe, view: 'website' }
```
after the Workstreams item.

---

## Design Constraints

Internal tool styling — follow existing app patterns exactly:

- All Tailwind — no inline styles, no CSS modules
- Match existing card/panel patterns in WorkstreamView.jsx
- Status colours: green=complete/live/done, blue=in_progress/in_review, amber=needs_update/medium, red=blocked/overdue/high, grey=not_started/draft/todo
- Buttons: use `<Button />` from `src/components/ui/Button.jsx`
- Badges: use `<Badge />` from `src/components/ui/Badge.jsx`
- Empty states: warm, actionable — never "No data available"
- No modals except where unavoidable — prefer inline forms that expand/collapse
- Status labels in sentence case: "In progress" not "IN_PROGRESS"

---

## Acceptance Criteria

1. Migration file exists at `supabase/migrations/030_create_website_project.sql` with all 5 tables, indexes, triggers, RLS enabled, and RLS policies.
2. `createWebsiteProject()` seeds exactly 5 phases (Discovery through Launch, order 1–5) on project creation.
3. `launchProject()` returns an error object (not throws) when Launch phase is not complete; when complete it sets all draft pages to live.
4. `useWebsiteProject` hook initialises by loading the project on mount, exposes all handlers.
5. `WebsiteView` renders `BuildView` when status is planning/in_progress, `OngoingView` when launched.
6. `PhaseAccordion` loads tasks on mount and shows progress N/total correctly.
7. `PageRegistry` shows amber/red review due date colouring.
8. Nav item "Website" appears in the sidebar and navigates to `WebsiteView`.
9. No TypeScript files introduced — all `.js` or `.jsx`.
10. App builds successfully: `npm run build` exits 0.

---

## Build Order

1. `supabase/migrations/030_create_website_project.sql`
2. `src/services/websiteProject.js`
3. `src/hooks/useWebsiteProject.js`
4. Components in this order: `TaskList.jsx` → `PhaseAccordion.jsx` → `BuildView.jsx` → `PageRegistry.jsx` → `ChangeRequestList.jsx` → `OngoingView.jsx` → `WebsiteView.jsx`
5. `src/App.jsx` — hook + case + nav item
6. Sidebar nav item registration
7. `npm run build` to verify
