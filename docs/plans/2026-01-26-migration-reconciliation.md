# Migration Plan Reconciliation

**Date:** 2026-01-26
**Purpose:** Resolve conflicts identified in plan review and provide implementation-ready specifications

---

## 1. Data Model Decision: Separate Tables

**Decision:** Keep workstreams as separate tables (matches current Supabase implementation)

### Rationale
- Current codebase uses `workstreams` and `workstream_tasks` tables (migration 011)
- Workstreams are conceptually different from workflow_items (ongoing buckets vs discrete projects)
- Separate tables allow different RLS rules and simpler queries

### Final D1 Schema

```sql
-- ============================================
-- COMPLETE D1 SCHEMA (RECONCILED)
-- ============================================

-- Users (core identity table)
CREATE TABLE users (
    id TEXT PRIMARY KEY,                    -- UUID generated in Worker
    email TEXT UNIQUE NOT NULL,             -- Primary identifier (lowercase)
    name TEXT,
    azure_oid TEXT UNIQUE,                  -- Azure AD Object ID for Graph API
    avatar_url TEXT,
    role TEXT DEFAULT 'member',             -- 'admin' | 'manager' | 'member'
    team TEXT,
    invited_at TEXT,                        -- ISO timestamp
    invited_by TEXT,                        -- Email of inviter
    claimed_at TEXT,                        -- ISO timestamp when first logged in
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Workflow Items (Projects and Jobs/Tasks)
CREATE TABLE workflow_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL DEFAULT 'project',  -- 'project' | 'job'
    workflow_status TEXT DEFAULT 'To Do',
    priority TEXT,
    owner_id TEXT REFERENCES users(id),
    owner_email TEXT NOT NULL,                  -- Denormalized for queries
    date TEXT,
    deadline TEXT,
    timeline_value TEXT,
    timeline_unit TEXT,
    archived INTEGER DEFAULT 0,
    parent_id TEXT REFERENCES workflow_items(id),
    -- JSON fields (parsed in Worker)
    collaborators TEXT DEFAULT '[]',            -- JSON array of emails
    tags TEXT DEFAULT '[]',                     -- JSON array of strings
    teams TEXT DEFAULT '[]',                    -- JSON array of strings
    dependencies TEXT DEFAULT '[]',             -- JSON array of UUIDs
    custom_fields TEXT DEFAULT '{}',            -- JSON object
    attachments TEXT DEFAULT '[]',              -- JSON array of attachment objects
    comments TEXT DEFAULT '[]',                 -- JSON array of comment objects
    documents TEXT DEFAULT '[]',                -- JSON array of document objects
    subtasks TEXT DEFAULT '[]',                 -- JSON array of subtask objects
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Workstreams (ongoing work buckets - SEPARATE from workflow_items)
CREATE TABLE workstreams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    owner_id TEXT REFERENCES users(id),
    owner_email TEXT NOT NULL,
    visibility TEXT DEFAULT 'personal',         -- 'personal' | 'shared'
    color TEXT DEFAULT 'blue',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Workstream Tasks (tasks within workstreams)
CREATE TABLE workstream_tasks (
    id TEXT PRIMARY KEY,
    workstream_id TEXT NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',             -- 'high' | 'medium' | 'low'
    status TEXT DEFAULT 'open',                 -- 'open' | 'in_progress' | 'done'
    sort_order INTEGER DEFAULT 0,
    deadline TEXT,
    assignee_id TEXT REFERENCES users(id),
    assignee_email TEXT,
    requester TEXT,
    task_type TEXT,                             -- 'issue' | 'feature_request' | etc
    tags TEXT DEFAULT '[]',                     -- JSON array
    linked_items TEXT DEFAULT '[]',             -- JSON array of workflow_item UUIDs
    comments TEXT DEFAULT '[]',                 -- JSON array
    attachments TEXT DEFAULT '[]',              -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Personal Todos
CREATE TABLE todos (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    user_email TEXT NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    date TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Habits
CREATE TABLE habits (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',             -- 'daily' | 'weekly'
    color TEXT,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Habit Completions
CREATE TABLE habit_completions (
    id TEXT PRIMARY KEY,
    habit_id TEXT REFERENCES habits(id) ON DELETE CASCADE,
    completed_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Matrix Tasks (Eisenhower)
CREATE TABLE matrix_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    quadrant TEXT NOT NULL,                     -- 'do' | 'schedule' | 'delegate' | 'eliminate'
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Whiteboards
CREATE TABLE whiteboards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    owner_id TEXT REFERENCES users(id),
    owner_email TEXT NOT NULL,
    owner_name TEXT,
    workflow_item_id TEXT REFERENCES workflow_items(id) ON DELETE SET NULL,
    canvas_width INTEGER DEFAULT 3000,
    canvas_height INTEGER DEFAULT 2000,
    background_color TEXT DEFAULT '#ffffff',
    grid_enabled INTEGER DEFAULT 1,
    is_shared INTEGER DEFAULT 0,
    shared_with TEXT DEFAULT '[]',              -- JSON array of emails
    share_mode TEXT DEFAULT 'view',             -- 'view' | 'edit'
    archived INTEGER DEFAULT 0,
    durable_object_id TEXT,                     -- Reference to DO for real-time
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Whiteboard Elements (D1 backup for Durable Object state)
CREATE TABLE whiteboard_elements (
    id TEXT PRIMARY KEY,
    whiteboard_id TEXT REFERENCES whiteboards(id) ON DELETE CASCADE,
    element_type TEXT NOT NULL,                 -- 'sticky' | 'text' | 'image' | 'connector' | 'shape'
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL,
    height REAL,
    rotation REAL DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    content TEXT,                               -- JSON for element-specific data
    background_color TEXT,
    border_color TEXT,
    text_color TEXT,
    font_size INTEGER,
    locked_by TEXT,
    locked_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Attachments (R2 file references)
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    item_id TEXT,                               -- Can reference workflow_items or workstream_tasks
    item_type TEXT NOT NULL,                    -- 'workflow_item' | 'workstream_task' | 'whiteboard'
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    content_type TEXT,
    size_bytes INTEGER,
    uploaded_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Activity Log
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,                  -- 'created' | 'updated' | 'deleted' | 'status_changed' | etc
    actor_id TEXT REFERENCES users(id),
    actor_email TEXT NOT NULL,
    actor_name TEXT,
    target_type TEXT NOT NULL,                  -- 'workflow_item' | 'workstream' | 'workstream_task' | etc
    target_id TEXT,
    target_title TEXT,
    details TEXT,                               -- JSON
    related_users TEXT,                         -- JSON array of emails
    created_at TEXT DEFAULT (datetime('now'))
);

-- Security Audit Log
CREATE TABLE security_audit_log (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,                   -- 'login_success' | 'login_failed' | 'unauthorized_access' | etc
    user_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,                               -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

-- Rate Limits
CREATE TABLE rate_limits (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,                   -- Email or IP
    action_type TEXT NOT NULL,                  -- 'invite_user' | 'delete_user' | etc
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TEXT NOT NULL,
    last_attempt_at TEXT NOT NULL,
    blocked_until TEXT,
    UNIQUE(identifier, action_type)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_azure_oid ON users(azure_oid);

CREATE INDEX idx_workflow_items_owner ON workflow_items(owner_email);
CREATE INDEX idx_workflow_items_type ON workflow_items(item_type);
CREATE INDEX idx_workflow_items_status ON workflow_items(workflow_status);
CREATE INDEX idx_workflow_items_archived ON workflow_items(archived);

CREATE INDEX idx_workstreams_owner ON workstreams(owner_email);
CREATE INDEX idx_workstreams_visibility ON workstreams(visibility);

CREATE INDEX idx_workstream_tasks_workstream ON workstream_tasks(workstream_id);
CREATE INDEX idx_workstream_tasks_assignee ON workstream_tasks(assignee_email);
CREATE INDEX idx_workstream_tasks_deadline ON workstream_tasks(deadline);

CREATE INDEX idx_todos_user ON todos(user_email);
CREATE INDEX idx_todos_date ON todos(date);

CREATE INDEX idx_habits_user ON habits(user_email);
CREATE INDEX idx_habit_completions_habit ON habit_completions(habit_id);
CREATE INDEX idx_habit_completions_date ON habit_completions(completed_date);

CREATE INDEX idx_matrix_tasks_user ON matrix_tasks(user_email);

CREATE INDEX idx_whiteboards_owner ON whiteboards(owner_email);
CREATE INDEX idx_whiteboards_item ON whiteboards(workflow_item_id);

CREATE INDEX idx_whiteboard_elements_whiteboard ON whiteboard_elements(whiteboard_id);

CREATE INDEX idx_attachments_item ON attachments(item_id, item_type);

CREATE INDEX idx_activity_log_actor ON activity_log(actor_email);
CREATE INDEX idx_activity_log_target ON activity_log(target_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

CREATE INDEX idx_security_audit_created ON security_audit_log(created_at DESC);

CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, action_type);
```

---

## 2. Authorization Logic (Fixed)

**Issue:** Previous `authorizeWorkflowItem()` expected a `collaborators` column but schema stores it as JSON in `collaborators` field.

**Fix:** Parse JSON collaborators in authorization middleware.

```typescript
// src/middleware/authorize.ts

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
}

type Action = 'read' | 'create' | 'update' | 'delete';

export async function authorizeWorkflowItem(
  user: User,
  itemId: string | null,
  action: Action,
  db: D1Database
): Promise<boolean> {
  // Anyone can read all items (team visibility)
  if (action === 'read') return true;

  // Anyone can create new items
  if (action === 'create') return true;

  // For update/delete, need to check ownership or collaboration
  if (!itemId) return false;

  const item = await db.prepare(`
    SELECT owner_email, collaborators FROM workflow_items WHERE id = ?
  `).bind(itemId).first<{ owner_email: string; collaborators: string }>();

  if (!item) return false;

  const isOwner = item.owner_email.toLowerCase() === user.email.toLowerCase();
  const isAdmin = user.role === 'admin';

  // Parse collaborators JSON array
  let collaboratorEmails: string[] = [];
  try {
    collaboratorEmails = JSON.parse(item.collaborators || '[]');
  } catch {
    collaboratorEmails = [];
  }

  // Check if user email is in collaborators (case-insensitive)
  const isCollaborator = collaboratorEmails.some(
    email => email.toLowerCase() === user.email.toLowerCase()
  );

  if (action === 'delete') {
    // Only owner or admin can delete
    return isOwner || isAdmin;
  }

  // Update: owner, collaborator, or admin
  return isOwner || isCollaborator || isAdmin;
}

export async function authorizeWorkstream(
  user: User,
  workstreamId: string | null,
  action: Action,
  db: D1Database
): Promise<boolean> {
  // For create, anyone can create their own
  if (action === 'create') return true;

  if (!workstreamId) return false;

  const workstream = await db.prepare(`
    SELECT owner_email, visibility FROM workstreams WHERE id = ?
  `).bind(workstreamId).first<{ owner_email: string; visibility: string }>();

  if (!workstream) return false;

  const isOwner = workstream.owner_email.toLowerCase() === user.email.toLowerCase();
  const isShared = workstream.visibility === 'shared';

  if (action === 'read') {
    // Can read if owner OR if shared
    return isOwner || isShared;
  }

  // Update/delete: owner only
  return isOwner;
}

export async function authorizeWorkstreamTask(
  user: User,
  taskId: string | null,
  action: Action,
  db: D1Database,
  requestBody?: { workstream_id?: string }  // Pass request body for create
): Promise<boolean> {
  // For task operations, check parent workstream access
  let workstreamId: string | null = null;

  if (taskId) {
    // Existing task - get workstream_id from database
    const task = await db.prepare(`
      SELECT workstream_id FROM workstream_tasks WHERE id = ?
    `).bind(taskId).first<{ workstream_id: string }>();

    if (!task) return false;
    workstreamId = task.workstream_id;
  } else if (action === 'create' && requestBody?.workstream_id) {
    // Creating new task - get workstream_id from request body
    workstreamId = requestBody.workstream_id;
  } else if (action === 'create') {
    // Create without workstream_id - reject
    return false;
  } else {
    // Non-create action without taskId - reject
    return false;
  }

  // Verify access to the parent workstream
  const workstream = await db.prepare(`
    SELECT owner_email, visibility FROM workstreams WHERE id = ?
  `).bind(workstreamId).first<{ owner_email: string; visibility: string }>();

  if (!workstream) return false;

  const isOwner = workstream.owner_email.toLowerCase() === user.email.toLowerCase();
  const isShared = workstream.visibility === 'shared';

  // Can access tasks if owner or workstream is shared
  return isOwner || isShared;
}

export async function authorizeWhiteboard(
  user: User,
  whiteboardId: string | null,
  action: Action,
  db: D1Database
): Promise<boolean> {
  if (action === 'create') return true;

  if (!whiteboardId) return false;

  const whiteboard = await db.prepare(`
    SELECT owner_email, is_shared, shared_with, share_mode FROM whiteboards WHERE id = ?
  `).bind(whiteboardId).first<{
    owner_email: string;
    is_shared: number;
    shared_with: string;
    share_mode: string;
  }>();

  if (!whiteboard) return false;

  const isOwner = whiteboard.owner_email.toLowerCase() === user.email.toLowerCase();

  // Parse shared_with JSON
  let sharedEmails: string[] = [];
  try {
    sharedEmails = JSON.parse(whiteboard.shared_with || '[]');
  } catch {
    sharedEmails = [];
  }

  const isSharedWith = sharedEmails.some(
    email => email.toLowerCase() === user.email.toLowerCase()
  );

  if (action === 'read') {
    return isOwner || isSharedWith;
  }

  if (action === 'update') {
    // Owner always can update
    if (isOwner) return true;
    // Shared users with edit mode can update
    return isSharedWith && whiteboard.share_mode === 'edit';
  }

  // Delete: owner only
  return isOwner;
}

// User-scoped resources (todos, habits, matrix_tasks)
export function authorizeUserResource(
  user: User,
  resourceUserId: string | null
): boolean {
  // User can only access their own resources
  // (Query should already filter by user_id, this is a safety check)
  if (!resourceUserId) return true; // Creating new
  return resourceUserId === user.id;
}
```

---

## 3. Authentication Transition (Clarified)

### Access Control Model

**Decision:** Domain-restricted SSO with optional pre-authorization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW (FINAL)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User visits app.momentum-hub.com                                    │
│                     │                                                    │
│                     ▼                                                    │
│  2. Cloudflare Access intercepts (no valid session cookie)             │
│                     │                                                    │
│                     ▼                                                    │
│  3. Redirect to Azure AD login                                          │
│     - Only @populationmatters.org users allowed (tenant restriction)   │
│                     │                                                    │
│                     ▼                                                    │
│  4. Azure AD authenticates, returns to Access callback                  │
│                     │                                                    │
│                     ▼                                                    │
│  5. Access sets CF-Access-JWT-Assertion cookie, redirects to app       │
│                     │                                                    │
│                     ▼                                                    │
│  6. Worker receives request with JWT in header                          │
│                     │                                                    │
│                     ▼                                                    │
│  7. Worker validates JWT, extracts email + azure_oid                    │
│                     │                                                    │
│                     ▼                                                    │
│  8. Worker checks D1: SELECT * FROM users WHERE email = ?               │
│                     │                                                    │
│           ┌────────┴────────┐                                           │
│           │                 │                                            │
│     User exists       User not found                                    │
│           │                 │                                            │
│           ▼                 ▼                                            │
│     Update azure_oid   PRE_AUTH_REQUIRED?                               │
│     if null              │                                              │
│           │         ┌────┴────┐                                         │
│           │        Yes        No                                        │
│           │         │          │                                        │
│           │    Return 403   Create user                                 │
│           │    "Contact     with role='member'                          │
│           │    admin"       claimed_at=now()                            │
│           │                    │                                        │
│           └────────┬───────────┘                                        │
│                    │                                                     │
│                    ▼                                                     │
│  9. Return user object to frontend                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Configuration Options

```typescript
// Environment variable in wrangler.toml
// PRE_AUTH_REQUIRED = "true" | "false"

// If true: User must be pre-added to D1 by admin before they can access
// If false: Any user with valid Azure AD credentials can auto-register
```

### Implementation

```typescript
// src/middleware/auth.ts

interface AccessJWT {
  email: string;
  sub: string;        // Azure AD Object ID
  name?: string;
  exp: number;
  iat: number;
  aud: string[];
}

interface AuthResult {
  user: User;
  isNewUser: boolean;
}

export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<AuthResult | Response> {
  // 1. Get JWT from CF Access header
  const token = request.headers.get('CF-Access-JWT-Assertion');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Decode and validate JWT
  let jwt: AccessJWT;
  try {
    jwt = decodeAndValidateJWT(token, env.ACCESS_AUD);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const email = jwt.email.toLowerCase();
  const azureOid = jwt.sub;
  const name = jwt.name || email.split('@')[0];

  // 3. Look up user in D1
  let user = await env.DB.prepare(`
    SELECT * FROM users WHERE email = ? OR azure_oid = ?
  `).bind(email, azureOid).first<User>();

  let isNewUser = false;

  if (user) {
    // Existing user - update azure_oid if not set
    if (!user.azure_oid) {
      await env.DB.prepare(`
        UPDATE users SET azure_oid = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(azureOid, user.id).run();
      user.azure_oid = azureOid;
    }
  } else {
    // New user
    if (env.PRE_AUTH_REQUIRED === 'true') {
      // Pre-authorization mode: check if user was invited
      const invited = await env.DB.prepare(`
        SELECT * FROM users WHERE email = ? AND invited_at IS NOT NULL
      `).bind(email).first<User>();

      if (!invited) {
        return new Response(JSON.stringify({
          error: 'Access denied',
          message: 'You must be invited by an administrator to access this application.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // User was invited - update their record
      await env.DB.prepare(`
        UPDATE users SET
          azure_oid = ?,
          name = COALESCE(name, ?),
          claimed_at = datetime('now'),
          updated_at = datetime('now')
        WHERE email = ?
      `).bind(azureOid, name, email).run();

      user = await env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<User>();
      isNewUser = true;
    } else {
      // Auto-registration mode: create new user
      const id = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO users (id, email, name, azure_oid, role, claimed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'member', datetime('now'), datetime('now'), datetime('now'))
      `).bind(id, email, name, azureOid).run();

      user = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<User>();
      isNewUser = true;

      // Log new user registration
      await env.DB.prepare(`
        INSERT INTO activity_log (id, action_type, actor_email, actor_name, target_type, target_id, target_title, created_at)
        VALUES (?, 'user_registered', ?, ?, 'user', ?, ?, datetime('now'))
      `).bind(crypto.randomUUID(), email, name, user!.id, email).run();
    }
  }

  return { user: user!, isNewUser };
}

function decodeAndValidateJWT(token: string, expectedAud: string): AccessJWT {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const payload = JSON.parse(atob(parts[1]));

  // Validate audience
  if (!payload.aud?.includes(expectedAud)) {
    throw new Error('Invalid audience');
  }

  // Validate expiration
  if (Date.now() / 1000 > payload.exp) {
    throw new Error('Token expired');
  }

  return payload as AccessJWT;
}
```

### Removed Features (SSO replaces these)

| Supabase Feature | Status | Notes |
|------------------|--------|-------|
| Email/password sign-in | REMOVED | Use Azure AD |
| Email/password sign-up | REMOVED | Users provision via Azure AD |
| Password reset | REMOVED | Users reset via Azure AD portal |
| Magic link | REMOVED | Use Azure AD |
| Email confirmation | REMOVED | Azure AD handles verification |

### Kept Features (adapted)

| Feature | Implementation |
|---------|----------------|
| User invite | Admin adds email to D1 with `invited_at` |
| Role management | Admin updates `role` column in D1 |
| User deletion | Admin deletes from D1 (user can't log in) |

---

## 4. User Identity Mapping Strategy

### The Problem
- Current users have email-based identity
- Azure AD provides Object ID (`oid` / `sub` claim)
- Need consistent mapping during and after migration

### The Solution

**Primary key:** `users.id` (UUID generated by us)
**Lookup keys:** `email` (unique) AND `azure_oid` (unique, nullable)

```typescript
// Identity resolution order:
// 1. Try azure_oid match (fastest, most reliable)
// 2. Try email match (for pre-migration users)
// 3. Create new user (if auto-registration enabled)
```

### Migration Strategy

```typescript
// During migration from Supabase:

async function migrateUsers(supabase: SupabaseClient, db: D1Database) {
  const { data: profiles } = await supabase.from('user_profiles').select('*');

  for (const profile of profiles || []) {
    const id = crypto.randomUUID();  // Generate new UUID for D1

    await db.prepare(`
      INSERT INTO users (
        id, email, name, role, team,
        invited_at, invited_by, claimed_at,
        azure_oid,  -- NULL initially, populated on first SSO login
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, datetime('now'))
    `).bind(
      id,
      profile.email.toLowerCase(),
      profile.name,
      profile.role || 'member',
      profile.team,
      profile.invited_at,
      profile.invited_by,
      profile.claimed_at,
      profile.created_at || new Date().toISOString()
    ).run();
  }
}
```

### Post-Migration: First Login

When a migrated user logs in via Azure AD for the first time:

1. JWT contains `email` and `sub` (azure_oid)
2. Worker looks up by email (matches migrated record)
3. Worker updates `azure_oid` column with the JWT `sub` value
4. Future logins can use either email or azure_oid for lookup

---

## 5. Complete Data Migration Script

```typescript
// scripts/migrate-all-data.ts

import { createClient } from '@supabase/supabase-js';

interface MigrationStats {
  users: number;
  workflowItems: number;
  workstreams: number;
  workstreamTasks: number;
  todos: number;
  habits: number;
  habitCompletions: number;
  matrixTasks: number;
  whiteboards: number;
  whiteboardElements: number;
  activityLogs: number;
  files: number;
  errors: string[];
}

export async function migrateAllData(
  supabaseUrl: string,
  supabaseKey: string,
  db: D1Database,
  r2: R2Bucket
): Promise<MigrationStats> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const stats: MigrationStats = {
    users: 0,
    workflowItems: 0,
    workstreams: 0,
    workstreamTasks: 0,
    todos: 0,
    habits: 0,
    habitCompletions: 0,
    matrixTasks: 0,
    whiteboards: 0,
    whiteboardElements: 0,
    activityLogs: 0,
    files: 0,
    errors: []
  };

  try {
    // ========== 1. USERS ==========
    console.log('Migrating users...');
    const { data: profiles } = await supabase.from('user_profiles').select('*');

    for (const p of profiles || []) {
      try {
        await db.prepare(`
          INSERT INTO users (id, email, name, role, team, invited_at, invited_by, claimed_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(email) DO NOTHING
        `).bind(
          crypto.randomUUID(),
          p.email?.toLowerCase(),
          p.name,
          p.role || 'member',
          p.team,
          p.invited_at,
          p.invited_by,
          p.claimed_at,
          p.created_at || new Date().toISOString()
        ).run();
        stats.users++;
      } catch (e) {
        stats.errors.push(`User ${p.email}: ${e.message}`);
      }
    }

    // Create user email → id lookup
    const { results: users } = await db.prepare('SELECT id, email FROM users').all();
    const userIdByEmail = new Map(users.map((u: any) => [u.email.toLowerCase(), u.id]));

    // ========== 2. WORKFLOW ITEMS ==========
    console.log('Migrating workflow items...');
    const { data: items } = await supabase.from('workflow_items').select('*');

    for (const item of items || []) {
      try {
        const ownerId = userIdByEmail.get(item.owner_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO workflow_items (
            id, title, description, item_type, workflow_status, priority,
            owner_id, owner_email, date, deadline, timeline_value, timeline_unit,
            archived, parent_id, collaborators, tags, teams, dependencies,
            custom_fields, attachments, comments, documents, subtasks,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          item.id,
          item.title,
          item.description,
          item.item_type || 'project',
          item.status || 'To Do',
          item.priority,
          ownerId,
          item.owner_email?.toLowerCase() || '',
          item.date,
          item.deadline,
          item.timeline_value,
          item.timeline_unit,
          item.archived ? 1 : 0,
          item.parent_id,
          JSON.stringify(item.collaborators || []),
          JSON.stringify(item.tags || []),
          JSON.stringify(item.teams || []),
          JSON.stringify(item.dependencies || []),
          JSON.stringify(item.custom_fields || {}),
          JSON.stringify(item.attachments || []),
          JSON.stringify(item.comments || []),
          JSON.stringify(item.documents || []),
          JSON.stringify(item.subtasks || []),
          item.created_at || new Date().toISOString(),
          item.updated_at || new Date().toISOString()
        ).run();
        stats.workflowItems++;
      } catch (e) {
        stats.errors.push(`WorkflowItem ${item.id}: ${e.message}`);
      }
    }

    // ========== 3. WORKSTREAMS ==========
    console.log('Migrating workstreams...');
    const { data: workstreams } = await supabase.from('workstreams').select('*');

    for (const ws of workstreams || []) {
      try {
        const ownerId = userIdByEmail.get(ws.owner_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO workstreams (id, title, description, owner_id, owner_email, visibility, color, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          ws.id,
          ws.title,
          ws.description,
          ownerId,
          ws.owner_email?.toLowerCase() || '',
          ws.visibility || 'personal',
          ws.color || 'blue',
          ws.created_at || new Date().toISOString(),
          ws.updated_at || new Date().toISOString()
        ).run();
        stats.workstreams++;
      } catch (e) {
        stats.errors.push(`Workstream ${ws.id}: ${e.message}`);
      }
    }

    // ========== 4. WORKSTREAM TASKS ==========
    console.log('Migrating workstream tasks...');
    const { data: wsTasks } = await supabase.from('workstream_tasks').select('*');

    for (const task of wsTasks || []) {
      try {
        const assigneeId = userIdByEmail.get(task.assignee_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO workstream_tasks (
            id, workstream_id, title, description, priority, status,
            sort_order, deadline, assignee_id, assignee_email, requester, task_type,
            tags, linked_items, comments, attachments, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          task.id,
          task.workstream_id,
          task.title,
          task.description,
          task.priority || 'medium',
          task.status || 'open',
          task.sort_order || 0,
          task.deadline,
          assigneeId,
          task.assignee_email?.toLowerCase(),
          task.requester,
          task.task_type,
          JSON.stringify(task.tags || []),
          JSON.stringify(task.linked_items || []),
          JSON.stringify(task.comments || []),
          JSON.stringify(task.attachments || []),
          task.created_at || new Date().toISOString(),
          task.updated_at || new Date().toISOString()
        ).run();
        stats.workstreamTasks++;
      } catch (e) {
        stats.errors.push(`WorkstreamTask ${task.id}: ${e.message}`);
      }
    }

    // ========== 5. PERSONAL TODOS ==========
    console.log('Migrating personal todos...');
    const { data: todos } = await supabase.from('personal_todos').select('*');

    for (const todo of todos || []) {
      try {
        const userId = userIdByEmail.get(todo.user_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO todos (id, user_id, user_email, text, completed, date, order_index, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          todo.id,
          userId,
          todo.user_email?.toLowerCase() || '',
          todo.text,
          todo.completed ? 1 : 0,
          todo.date,
          todo.order_index || 0,
          todo.created_at || new Date().toISOString(),
          todo.updated_at || new Date().toISOString()
        ).run();
        stats.todos++;
      } catch (e) {
        stats.errors.push(`Todo ${todo.id}: ${e.message}`);
      }
    }

    // ========== 6. HABITS ==========
    console.log('Migrating habits...');
    const { data: habits } = await supabase.from('habits').select('*');

    for (const habit of habits || []) {
      try {
        const userId = userIdByEmail.get(habit.user_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO habits (id, user_id, user_email, name, frequency, color, archived, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          habit.id,
          userId,
          habit.user_email?.toLowerCase() || '',
          habit.name,
          habit.frequency || 'daily',
          habit.color,
          habit.archived ? 1 : 0,
          habit.created_at || new Date().toISOString()
        ).run();
        stats.habits++;
      } catch (e) {
        stats.errors.push(`Habit ${habit.id}: ${e.message}`);
      }
    }

    // ========== 7. HABIT COMPLETIONS ==========
    console.log('Migrating habit completions...');
    const { data: completions } = await supabase.from('habit_completions').select('*');

    for (const c of completions || []) {
      try {
        await db.prepare(`
          INSERT INTO habit_completions (id, habit_id, completed_date, created_at)
          VALUES (?, ?, ?, ?)
        `).bind(
          c.id,
          c.habit_id,
          c.completed_date,
          c.created_at || new Date().toISOString()
        ).run();
        stats.habitCompletions++;
      } catch (e) {
        stats.errors.push(`HabitCompletion ${c.id}: ${e.message}`);
      }
    }

    // ========== 8. MATRIX TASKS ==========
    console.log('Migrating matrix tasks...');
    const { data: matrixTasks } = await supabase.from('matrix_tasks').select('*');

    for (const mt of matrixTasks || []) {
      try {
        const userId = userIdByEmail.get(mt.user_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO matrix_tasks (id, user_id, user_email, title, quadrant, completed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          mt.id,
          userId,
          mt.user_email?.toLowerCase() || '',
          mt.title,
          mt.quadrant,
          mt.completed ? 1 : 0,
          mt.created_at || new Date().toISOString(),
          mt.updated_at || new Date().toISOString()
        ).run();
        stats.matrixTasks++;
      } catch (e) {
        stats.errors.push(`MatrixTask ${mt.id}: ${e.message}`);
      }
    }

    // ========== 9. WHITEBOARDS ==========
    console.log('Migrating whiteboards...');
    const { data: whiteboards } = await supabase.from('whiteboards').select('*');

    for (const wb of whiteboards || []) {
      try {
        const ownerId = userIdByEmail.get(wb.owner_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO whiteboards (
            id, title, description, owner_id, owner_email, owner_name,
            workflow_item_id, canvas_width, canvas_height, background_color,
            grid_enabled, is_shared, shared_with, share_mode, archived,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          wb.id,
          wb.title,
          wb.description,
          ownerId,
          wb.owner_email?.toLowerCase() || '',
          wb.owner_name,
          wb.workflow_item_id,
          wb.canvas_width || 3000,
          wb.canvas_height || 2000,
          wb.background_color || '#ffffff',
          wb.grid_enabled ? 1 : 0,
          wb.is_shared ? 1 : 0,
          JSON.stringify(wb.shared_with || []),
          wb.share_mode || 'view',
          wb.archived ? 1 : 0,
          wb.created_at || new Date().toISOString(),
          wb.updated_at || new Date().toISOString()
        ).run();
        stats.whiteboards++;
      } catch (e) {
        stats.errors.push(`Whiteboard ${wb.id}: ${e.message}`);
      }
    }

    // ========== 10. WHITEBOARD ELEMENTS ==========
    console.log('Migrating whiteboard elements...');
    const { data: elements } = await supabase.from('whiteboard_elements').select('*');

    for (const el of elements || []) {
      try {
        const createdById = userIdByEmail.get(el.created_by?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO whiteboard_elements (
            id, whiteboard_id, element_type, x, y, width, height,
            rotation, z_index, content, background_color, border_color,
            text_color, font_size, locked_by, locked_at, created_by,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          el.id,
          el.whiteboard_id,
          el.element_type,
          el.x,
          el.y,
          el.width,
          el.height,
          el.rotation || 0,
          el.z_index || 0,
          JSON.stringify(el.content || {}),
          el.background_color,
          el.border_color,
          el.text_color,
          el.font_size,
          el.locked_by,
          el.locked_at,
          createdById,
          el.created_at || new Date().toISOString(),
          el.updated_at || new Date().toISOString()
        ).run();
        stats.whiteboardElements++;
      } catch (e) {
        stats.errors.push(`WhiteboardElement ${el.id}: ${e.message}`);
      }
    }

    // ========== 11. ACTIVITY LOGS ==========
    console.log('Migrating activity logs...');
    const { data: logs } = await supabase.from('activity_log').select('*');

    for (const log of logs || []) {
      try {
        const actorId = userIdByEmail.get(log.actor_email?.toLowerCase()) || null;

        await db.prepare(`
          INSERT INTO activity_log (
            id, action_type, actor_id, actor_email, actor_name,
            target_type, target_id, target_title, details, related_users, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          log.id,
          log.action_type,
          actorId,
          log.actor_email?.toLowerCase() || '',
          log.actor_name,
          log.target_type,
          log.target_id,
          log.target_title,
          JSON.stringify(log.details || {}),
          JSON.stringify(log.related_users || []),
          log.created_at || new Date().toISOString()
        ).run();
        stats.activityLogs++;
      } catch (e) {
        stats.errors.push(`ActivityLog ${log.id}: ${e.message}`);
      }
    }

    // ========== 12. FILES (Supabase Storage → R2) ==========
    // Files in Supabase are stored in workflow_items.attachments JSON array
    // We need to extract them and migrate to R2 + attachments table
    console.log('Migrating files from workflow_items...');

    // Get all items with attachments
    const { data: itemsWithAttachments } = await supabase
      .from('workflow_items')
      .select('id, attachments')
      .not('attachments', 'is', null);

    for (const item of itemsWithAttachments || []) {
      const attachments = item.attachments || [];
      for (const att of attachments) {
        try {
          // att structure: { id, name, url, type, size, uploadedAt, uploadedBy }
          if (!att.url) continue;

          // Extract storage path from URL
          const storagePath = extractStoragePath(att.url);
          if (!storagePath) continue;

          // Download from Supabase Storage
          const { data: blob } = await supabase.storage.from('attachments').download(storagePath);
          if (!blob) continue;

          // Generate new R2 key
          const attachmentId = att.id || crypto.randomUUID();
          const r2Key = `attachments/${item.id}/${attachmentId}/${att.name}`;

          // Upload to R2
          await r2.put(r2Key, blob, {
            httpMetadata: { contentType: att.type || 'application/octet-stream' }
          });

          // Insert into attachments table
          const uploaderId = att.uploadedBy ? userIdByEmail.get(att.uploadedBy.toLowerCase()) : null;
          await db.prepare(`
            INSERT INTO attachments (id, item_id, item_type, filename, r2_key, content_type, size_bytes, uploaded_by, created_at)
            VALUES (?, ?, 'workflow_item', ?, ?, ?, ?, ?, ?)
          `).bind(
            attachmentId,
            item.id,
            att.name,
            r2Key,
            att.type,
            att.size,
            uploaderId,
            att.uploadedAt || new Date().toISOString()
          ).run();

          stats.files++;
        } catch (e) {
          stats.errors.push(`File ${att.name} for item ${item.id}: ${e.message}`);
        }
      }
    }

    // Also migrate workstream_task attachments
    console.log('Migrating files from workstream_tasks...');
    const { data: tasksWithAttachments } = await supabase
      .from('workstream_tasks')
      .select('id, attachments')
      .not('attachments', 'is', null);

    for (const task of tasksWithAttachments || []) {
      const attachments = task.attachments || [];
      for (const att of attachments) {
        try {
          if (!att.url) continue;
          const storagePath = extractStoragePath(att.url);
          if (!storagePath) continue;

          const { data: blob } = await supabase.storage.from('attachments').download(storagePath);
          if (!blob) continue;

          const attachmentId = att.id || crypto.randomUUID();
          const r2Key = `attachments/${task.id}/${attachmentId}/${att.name}`;

          await r2.put(r2Key, blob, {
            httpMetadata: { contentType: att.type || 'application/octet-stream' }
          });

          const uploaderId = att.uploadedBy ? userIdByEmail.get(att.uploadedBy.toLowerCase()) : null;
          await db.prepare(`
            INSERT INTO attachments (id, item_id, item_type, filename, r2_key, content_type, size_bytes, uploaded_by, created_at)
            VALUES (?, ?, 'workstream_task', ?, ?, ?, ?, ?, ?)
          `).bind(attachmentId, task.id, att.name, r2Key, att.type, att.size, uploaderId, att.uploadedAt || new Date().toISOString()).run();

          stats.files++;
        } catch (e) {
          stats.errors.push(`File ${att.name} for task ${task.id}: ${e.message}`);
        }
      }
    }

    console.log('Migration complete!');
    return stats;

  } catch (error) {
    stats.errors.push(`Fatal error: ${error.message}`);
    return stats;
  }
}
```

---

## 6. Verification Checklist (Concrete)

### Phase 1: Infrastructure

```bash
# D1 database created and accessible
wrangler d1 execute momentum-hub --command "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
# Expected: count = 14 (all tables created)
# Tables: users, workflow_items, workstreams, workstream_tasks, todos, habits,
#         habit_completions, matrix_tasks, whiteboards, whiteboard_elements,
#         attachments, activity_log, security_audit_log, rate_limits

# R2 bucket accessible
wrangler r2 object list momentum-hub-files --max-keys 1
# Expected: No error

# Worker deployed and responding
curl -s https://api.momentum-hub.com/health | jq .
# Expected: {"status":"ok","timestamp":"..."}
```

### Phase 2: Authentication

```bash
# Test 1: Unauthenticated request rejected
curl -s https://api.momentum-hub.com/api/users/me
# Expected: 401 {"error":"Not authenticated"}

# Test 2: Valid CF Access token accepted
# (Must test in browser with valid Azure AD session)
# Navigate to app → should see user profile

# Test 3: New user auto-provisioned (if PRE_AUTH_REQUIRED=false)
# First login → user created in D1
wrangler d1 execute momentum-hub --command "SELECT COUNT(*) FROM users WHERE claimed_at IS NOT NULL"
# Expected: count > 0

# Test 4: Pre-auth user can claim account
# Admin adds user, then user logs in
wrangler d1 execute momentum-hub --command "SELECT email, invited_at, claimed_at FROM users WHERE email='test@domain.com'"
# Expected: invited_at set, claimed_at updated after login
```

### Phase 3: Core API

```bash
# Test: Create workflow item
curl -X POST https://api.momentum-hub.com/api/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","itemType":"project"}' \
  | jq .
# Expected: {"id":"uuid-here"}

# Test: List items
curl https://api.momentum-hub.com/api/items | jq 'length'
# Expected: >= 1

# Test: Update item
curl -X PUT https://api.momentum-hub.com/api/items/{id} \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}'
# Expected: {"updated":true}

# Test: Delete item
curl -X DELETE https://api.momentum-hub.com/api/items/{id}
# Expected: {"deleted":true}

# Repeat for: /api/workstreams, /api/todos, /api/habits, /api/matrix-tasks
```

### Phase 4: File Storage

```bash
# Test: Upload file
curl -X POST https://api.momentum-hub.com/api/files/upload \
  -F "file=@test.pdf" \
  -F "itemId=uuid-here" \
  | jq .
# Expected: {"id":"...","filename":"test.pdf","size":...}

# Test: Download file
curl -o downloaded.pdf https://api.momentum-hub.com/api/files/{id}
# Expected: File downloads successfully

# Test: File too large
curl -X POST https://api.momentum-hub.com/api/files/upload \
  -F "file=@large-file.zip" \
  -F "itemId=uuid-here"
# Expected: 400 {"error":"File too large"}

# Test: Blocked file type
curl -X POST https://api.momentum-hub.com/api/files/upload \
  -F "file=@script.exe" \
  -F "itemId=uuid-here"
# Expected: 400 {"error":"File type not allowed"}
```

### Phase 5: Whiteboards

```javascript
// Test: WebSocket connection
const ws = new WebSocket('wss://api.momentum-hub.com/api/whiteboard/test-id?userId=user1&userName=Test');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
// Expected: {type:'init', elements:[], version:0, users:[...]}

// Test: Draw element
ws.send(JSON.stringify({
  type: 'draw',
  element: { id: 'el1', type: 'sticky', x: 100, y: 100, content: { text: 'Hello' } }
}));
// Expected: Other clients receive {type:'element_added', element:{...}}

// Test: Persistence
// Disconnect and reconnect
// Expected: Previous elements restored from D1
```

### Phase 6: Frontend

```
Manual testing checklist:
[ ] App loads at https://momentum-hub.pages.dev
[ ] SSO redirect works (Azure AD login)
[ ] Dashboard renders with stats
[ ] Can create/edit/delete projects
[ ] Can create/edit/delete tasks
[ ] Can create/edit workstreams
[ ] Can create/edit workstream tasks
[ ] Personal todos work
[ ] Habit tracker works
[ ] Eisenhower matrix works
[ ] Whiteboard loads and allows drawing
[ ] Whiteboard collaboration works (two browsers)
[ ] File upload/download works
[ ] Search works
[ ] Manager hub loads (for managers)
[ ] Admin console loads (for admins)
```

### Phase 7: Data Migration

```sql
-- Verification queries (run in both Supabase and D1, compare counts)

-- Users
SELECT COUNT(*) FROM users;  -- D1
SELECT COUNT(*) FROM user_profiles;  -- Supabase
-- Should match

-- Workflow items
SELECT COUNT(*) FROM workflow_items;  -- Both
-- Should match

-- Workstreams
SELECT COUNT(*) FROM workstreams;  -- Both
-- Should match

-- Workstream tasks
SELECT COUNT(*) FROM workstream_tasks;  -- Both
-- Should match

-- Todos
SELECT COUNT(*) FROM todos;  -- D1
SELECT COUNT(*) FROM personal_todos;  -- Supabase
-- Should match

-- Habits
SELECT COUNT(*) FROM habits;  -- Both
-- Should match

-- Whiteboards
SELECT COUNT(*) FROM whiteboards;  -- Both
-- Should match

-- Sample data spot check (pick 5 random items, verify all fields match)
```

---

## 7. Whiteboard Durable Object to D1 Sync

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WHITEBOARD PERSISTENCE FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Client ──WebSocket──► Durable Object (in-memory state)                 │
│                              │                                           │
│                              │ Every 10 operations OR every 30 seconds  │
│                              ▼                                           │
│                        DO Storage (immediate persistence)                │
│                              │                                           │
│                              │ On flush trigger                          │
│                              ▼                                           │
│                     Worker ──► D1 (durable backup)                      │
│                                                                          │
│  Recovery Flow:                                                          │
│  1. DO starts → load from DO Storage                                    │
│  2. DO Storage empty → load from D1 backup                              │
│  3. D1 empty → start fresh                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Durable Object Implementation (with D1 sync)

```typescript
// src/durable-objects/whiteboard-session.ts

export class WhiteboardSession {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, { userId: string; userName: string }>;
  private whiteboard: WhiteboardState;
  private whiteboardId: string;
  private lastD1Sync: number = 0;
  private pendingChanges: number = 0;
  private syncInterval: number | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.whiteboard = { elements: new Map(), version: 0 };
    this.whiteboardId = '';

    // Load state from storage on initialization
    this.state.blockConcurrencyWhile(async () => {
      await this.loadState();

      // Schedule periodic D1 sync alarm (every 30 seconds)
      const currentAlarm = await this.state.storage.getAlarm();
      if (!currentAlarm) {
        await this.state.storage.setAlarm(Date.now() + 30000);
      }
    });
  }

  private async loadState() {
    // Try DO storage first (fastest)
    const stored = await this.state.storage.get<{
      elements: [string, DrawElement][];
      version: number;
      whiteboardId: string;
    }>('whiteboard');

    if (stored) {
      this.whiteboard.elements = new Map(stored.elements);
      this.whiteboard.version = stored.version;
      this.whiteboardId = stored.whiteboardId;
      return;
    }

    // Fall back to D1 if DO storage is empty
    // (This handles DO eviction/recreation scenarios)
    // whiteboardId is set from the request URL in fetch()
  }

  private async loadFromD1(whiteboardId: string) {
    try {
      const { results } = await this.env.DB.prepare(`
        SELECT * FROM whiteboard_elements WHERE whiteboard_id = ?
      `).bind(whiteboardId).all();

      for (const row of results || []) {
        this.whiteboard.elements.set(row.id as string, {
          id: row.id as string,
          type: row.element_type as string,
          x: row.x as number,
          y: row.y as number,
          width: row.width as number,
          height: row.height as number,
          rotation: row.rotation as number,
          zIndex: row.z_index as number,
          content: row.content ? JSON.parse(row.content as string) : {},
          backgroundColor: row.background_color as string,
          borderColor: row.border_color as string,
          textColor: row.text_color as string,
          fontSize: row.font_size as number,
          createdBy: row.created_by as string,
          createdAt: row.created_at as string
        });
      }

      // Get max version from D1
      const versionRow = await this.env.DB.prepare(`
        SELECT MAX(CAST(substr(updated_at, 1, 19) AS TEXT)) as max_time
        FROM whiteboard_elements WHERE whiteboard_id = ?
      `).bind(whiteboardId).first();

      this.whiteboard.version = this.whiteboard.elements.size;
    } catch (error) {
      console.error('Failed to load from D1:', error);
    }
  }

  private async syncToD1() {
    if (!this.whiteboardId || this.pendingChanges === 0) return;

    try {
      // Batch upsert all elements to D1
      const elements = Array.from(this.whiteboard.elements.values());

      for (const el of elements) {
        await this.env.DB.prepare(`
          INSERT INTO whiteboard_elements (
            id, whiteboard_id, element_type, x, y, width, height,
            rotation, z_index, content, background_color, border_color,
            text_color, font_size, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            x = excluded.x,
            y = excluded.y,
            width = excluded.width,
            height = excluded.height,
            rotation = excluded.rotation,
            z_index = excluded.z_index,
            content = excluded.content,
            background_color = excluded.background_color,
            border_color = excluded.border_color,
            text_color = excluded.text_color,
            font_size = excluded.font_size,
            updated_at = datetime('now')
        `).bind(
          el.id,
          this.whiteboardId,
          el.type,
          el.x,
          el.y,
          el.width,
          el.height,
          el.rotation || 0,
          el.zIndex || 0,
          JSON.stringify(el.content || {}),
          el.backgroundColor,
          el.borderColor,
          el.textColor,
          el.fontSize,
          el.createdBy,
          el.createdAt || new Date().toISOString()
        ).run();
      }

      // Delete elements that were removed
      const currentIds = elements.map(e => e.id);
      if (currentIds.length > 0) {
        await this.env.DB.prepare(`
          DELETE FROM whiteboard_elements
          WHERE whiteboard_id = ? AND id NOT IN (${currentIds.map(() => '?').join(',')})
        `).bind(this.whiteboardId, ...currentIds).run();
      }

      this.pendingChanges = 0;
      this.lastD1Sync = Date.now();
    } catch (error) {
      console.error('Failed to sync to D1:', error);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract whiteboard ID from URL
    const pathParts = url.pathname.split('/');
    const idIndex = pathParts.findIndex(p => p === 'whiteboard') + 1;
    if (idIndex > 0 && pathParts[idIndex]) {
      this.whiteboardId = pathParts[idIndex];

      // Load from D1 if not yet loaded
      if (this.whiteboard.elements.size === 0) {
        await this.loadFromD1(this.whiteboardId);
      }
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST endpoints
    switch (url.pathname.split('/').pop()) {
      case 'state':
        return this.getState();
      case 'sync':
        await this.syncToD1();
        return Response.json({ synced: true, version: this.whiteboard.version });
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleMessage(message: any, sender: WebSocket) {
    // ... existing message handling ...

    // Track pending changes
    if (['draw', 'update', 'delete'].includes(message.type)) {
      this.pendingChanges++;

      // Sync to D1 every 10 operations
      if (this.pendingChanges >= 10) {
        await this.syncToD1();
      }
    }

    // Persist to DO storage immediately (fast)
    if (this.whiteboard.version % 5 === 0) {
      await this.state.storage.put('whiteboard', {
        elements: Array.from(this.whiteboard.elements.entries()),
        version: this.whiteboard.version,
        whiteboardId: this.whiteboardId
      });
    }
  }

  // Alarm for periodic D1 sync (every 30 seconds if changes pending)
  async alarm() {
    if (this.pendingChanges > 0) {
      await this.syncToD1();
    }
    // Reschedule alarm
    this.state.storage.setAlarm(Date.now() + 30000);
  }
}
```

### Recovery Verification Test

```bash
# Test: Whiteboard state survives DO eviction
# 1. Create elements in whiteboard
# 2. Wait for D1 sync (30 seconds or 10 operations)
# 3. Delete DO (simulated eviction)
wrangler d1 execute momentum-hub --command "SELECT COUNT(*) FROM whiteboard_elements WHERE whiteboard_id='test-id'"
# Expected: count > 0

# 4. Reconnect to whiteboard
# Expected: Elements restored from D1
```

---

## 8. Rate Limiting Implementation

### Middleware

```typescript
// src/middleware/rate-limit.ts

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  invite_user: { maxAttempts: 10, windowMinutes: 60, blockMinutes: 60 },
  delete_user: { maxAttempts: 5, windowMinutes: 60, blockMinutes: 120 },
  delete_invite: { maxAttempts: 10, windowMinutes: 60, blockMinutes: 60 },
  file_upload: { maxAttempts: 50, windowMinutes: 60, blockMinutes: 30 },
  api_request: { maxAttempts: 1000, windowMinutes: 60, blockMinutes: 5 },
};

export async function checkRateLimit(
  db: D1Database,
  identifier: string,
  actionType: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMITS[actionType] || RATE_LIMITS.api_request;
  const now = new Date().toISOString();

  // Check existing rate limit record
  const record = await db.prepare(`
    SELECT * FROM rate_limits
    WHERE identifier = ? AND action_type = ?
  `).bind(identifier, actionType).first<{
    attempt_count: number;
    first_attempt_at: string;
    blocked_until: string | null;
  }>();

  // If blocked, check if block has expired
  if (record?.blocked_until) {
    const blockedUntil = new Date(record.blocked_until);
    if (blockedUntil > new Date()) {
      return {
        allowed: false,
        retryAfter: Math.ceil((blockedUntil.getTime() - Date.now()) / 1000)
      };
    }
    // Block expired, reset record
    await db.prepare(`
      DELETE FROM rate_limits WHERE identifier = ? AND action_type = ?
    `).bind(identifier, actionType).run();
  }

  // Check if within window
  if (record) {
    const windowStart = new Date(record.first_attempt_at);
    const windowEnd = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000);

    if (new Date() < windowEnd) {
      // Within window
      if (record.attempt_count >= config.maxAttempts) {
        // Exceeded limit, block
        const blockedUntil = new Date(Date.now() + config.blockMinutes * 60 * 1000).toISOString();
        await db.prepare(`
          UPDATE rate_limits SET blocked_until = ?, last_attempt_at = ?
          WHERE identifier = ? AND action_type = ?
        `).bind(blockedUntil, now, identifier, actionType).run();

        return {
          allowed: false,
          retryAfter: config.blockMinutes * 60
        };
      }

      // Increment counter
      await db.prepare(`
        UPDATE rate_limits SET attempt_count = attempt_count + 1, last_attempt_at = ?
        WHERE identifier = ? AND action_type = ?
      `).bind(now, identifier, actionType).run();
    } else {
      // Window expired, reset
      await db.prepare(`
        UPDATE rate_limits SET attempt_count = 1, first_attempt_at = ?, last_attempt_at = ?
        WHERE identifier = ? AND action_type = ?
      `).bind(now, now, identifier, actionType).run();
    }
  } else {
    // First attempt
    await db.prepare(`
      INSERT INTO rate_limits (id, identifier, action_type, attempt_count, first_attempt_at, last_attempt_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).bind(crypto.randomUUID(), identifier, actionType, now, now).run();
  }

  return { allowed: true };
}

export async function resetRateLimit(
  db: D1Database,
  identifier: string,
  actionType: string
): Promise<void> {
  await db.prepare(`
    DELETE FROM rate_limits WHERE identifier = ? AND action_type = ?
  `).bind(identifier, actionType).run();
}
```

### Usage in Routes

```typescript
// src/routes/admin.ts

adminRouter.post('/invite', async (c) => {
  const user = c.get('user');
  const { email } = await c.req.json();

  // Check rate limit
  const { allowed, retryAfter } = await checkRateLimit(
    c.env.DB,
    user.email,  // Limit by admin email
    'invite_user'
  );

  if (!allowed) {
    return c.json({
      error: 'Rate limited',
      retryAfter
    }, 429);
  }

  // ... rest of invite logic
});
```

### Cleanup Job

```typescript
// Run periodically (e.g., daily via Cron Trigger)
export async function cleanupExpiredRateLimits(db: D1Database) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  await db.prepare(`
    DELETE FROM rate_limits
    WHERE last_attempt_at < ? AND blocked_until IS NULL
  `).bind(cutoff).run();

  await db.prepare(`
    DELETE FROM rate_limits
    WHERE blocked_until < datetime('now')
  `).run();
}
```

---

## 9. Notifications Implementation

### Current State
- Supabase Realtime provides push notifications via WebSocket subscriptions
- `useNotifications.js` polls/subscribes to `activity_log` table
- Notifications show mentions (@user) and activity on owned/collaborated items

### Cloudflare Alternative: Polling + Optional SSE

Since Cloudflare Workers don't have persistent WebSocket connections outside of Durable Objects, notifications will use polling with optional Server-Sent Events upgrade.

```typescript
// src/routes/notifications.ts

import { Hono } from 'hono';

export const notificationsRouter = new Hono<{ Bindings: Env }>();

// Polling endpoint - frontend calls every 30 seconds
notificationsRouter.get('/', async (c) => {
  const user = c.get('user');
  const since = c.req.query('since'); // ISO timestamp of last fetch

  let query = `
    SELECT * FROM activity_log
    WHERE (
      -- Mentions me
      related_users LIKE ? OR
      -- Activity on my items
      target_id IN (
        SELECT id FROM workflow_items WHERE owner_email = ?
        UNION
        SELECT id FROM workstreams WHERE owner_email = ?
      )
    )
  `;
  const params: string[] = [`%${user.email}%`, user.email, user.email];

  if (since) {
    query += ' AND created_at > ?';
    params.push(since);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    notifications: results,
    timestamp: new Date().toISOString()
  });
});

// Mark notifications as read (optional - if tracking read state)
notificationsRouter.post('/read', async (c) => {
  const user = c.get('user');
  const { notificationIds } = await c.req.json();

  // If implementing read tracking, add a user_notifications table
  // For MVP, frontend can track read state locally

  return c.json({ success: true });
});

// Server-Sent Events endpoint (optional upgrade for real-time feel)
notificationsRouter.get('/stream', async (c) => {
  const user = c.get('user');

  // Create a TransformStream for SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection message
  await writer.write(encoder.encode(`data: {"type":"connected"}\n\n`));

  // Poll D1 every 10 seconds and push new notifications
  let lastCheck = new Date().toISOString();
  const interval = setInterval(async () => {
    try {
      const { results } = await c.env.DB.prepare(`
        SELECT * FROM activity_log
        WHERE created_at > ?
        AND (related_users LIKE ? OR target_id IN (
          SELECT id FROM workflow_items WHERE owner_email = ?
        ))
        ORDER BY created_at DESC LIMIT 10
      `).bind(lastCheck, `%${user.email}%`, user.email).all();

      if (results.length > 0) {
        await writer.write(encoder.encode(
          `data: ${JSON.stringify({ type: 'notifications', data: results })}\n\n`
        ));
        lastCheck = new Date().toISOString();
      }
    } catch (e) {
      console.error('SSE poll error:', e);
    }
  }, 10000);

  // Clean up on disconnect
  c.req.raw.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});
```

### Frontend Integration

```typescript
// src/hooks/useNotifications.ts (updated for Cloudflare)

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  // Polling approach (simple, reliable)
  useEffect(() => {
    const fetchNotifications = async () => {
      const params = lastFetch ? `?since=${lastFetch}` : '';
      const response = await fetch(`/api/notifications${params}`);
      const data = await response.json();

      if (data.notifications.length > 0) {
        setNotifications(prev => [...data.notifications, ...prev].slice(0, 100));
      }
      setLastFetch(data.timestamp);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  // Optional: Upgrade to SSE for better UX
  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notifications') {
        setNotifications(prev => [...data.data, ...prev].slice(0, 100));
      }
    };

    eventSource.onerror = () => {
      // Fall back to polling on error
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  return { notifications, unreadCount: notifications.filter(n => !n.read).length };
}
```

### Feature Parity Checklist

| Supabase Feature | Cloudflare Alternative | Status |
|-----------------|----------------------|--------|
| Real-time push via WebSocket | Polling (30s) + optional SSE | ✅ Implemented |
| @mention detection | Query `related_users` column | ✅ Same |
| Activity on owned items | Query by `owner_email` | ✅ Same |
| Unread count badge | Frontend state tracking | ✅ Same |

---

## 10. Helper Functions for Migration

```typescript
// Extract storage path from Supabase Storage URL
function extractStoragePath(url: string): string | null {
  // URL format: https://xxx.supabase.co/storage/v1/object/public/attachments/path/to/file
  // or: https://xxx.supabase.co/storage/v1/object/authenticated/attachments/path/to/file
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated)\/attachments\/(.+)/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}
```

---

## Summary of Reconciled Decisions

| Issue | Decision |
|-------|----------|
| Workstream model | Separate `workstreams` + `workstream_tasks` tables |
| Collaborators storage | JSON in `collaborators` column, parsed in Worker |
| Auth mode | SSO-only via CF Access + Azure AD |
| Pre-authorization | Configurable via `PRE_AUTH_REQUIRED` env var |
| User identity | Email as primary lookup, azure_oid populated on first SSO |
| Migration completeness | Full script for all 11 data types + files |

This document supersedes conflicting sections in the original design and feature-parity matrix.
