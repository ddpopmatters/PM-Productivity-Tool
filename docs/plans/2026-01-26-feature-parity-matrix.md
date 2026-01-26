# Feature Parity Matrix: Supabase → Cloudflare

**Date:** 2026-01-26
**Purpose:** Map all current Supabase features to Cloudflare equivalents for migration planning

---

## 1. Database Tables

### Current Tables vs D1 Schema

| Supabase Table | Columns | D1 Status | Notes |
|----------------|---------|-----------|-------|
| **workflow_items** | id, title, description, status, owner, owner_email, collaborators[], item_type, archived, dependencies, custom_fields, attachments, tags[], teams[], comments[], documents[] | ✅ Covered | JSON fields need parsing in Worker |
| **workstreams** | id, title, description, owner, owner_email, visibility, color, created_at, updated_at | ❌ MISSING | Add to D1 schema |
| **workstream_tasks** | id, workstream_id, title, description, priority, status, assignee, assignee_email, task_type, deadline, tags[], linked_items[], comments[], attachments[] | ❌ MISSING | Add to D1 schema |
| **user_profiles** | email, name, team, role, invited_at, invited_by, claimed_at | ⚠️ PARTIAL | Current schema has users table but missing invited_at, invited_by, claimed_at |
| **personal_todos** | id, user_email, text, completed, date, order_index, created_at, updated_at | ✅ Covered | Named "todos" in current schema |
| **habits** | id, user_email, name, frequency, color, created_at, archived | ❌ MISSING | Add to D1 schema |
| **habit_completions** | id, habit_id, completed_date, created_at | ❌ MISSING | Add to D1 schema |
| **matrix_tasks** | id, user_email, title, quadrant, completed, created_at, updated_at | ❌ MISSING | Add to D1 schema |
| **whiteboards** | id, title, description, owner_email, owner_name, workflow_item_id, canvas_width, canvas_height, background_color, grid_enabled, is_shared, shared_with[], share_mode, archived | ⚠️ PARTIAL | Current schema missing many fields |
| **whiteboard_elements** | id, whiteboard_id, element_type, x, y, width, height, rotation, z_index, content, background_color, border_color, text_color, locked_by, locked_at, created_by | ❌ MISSING | Currently only in Durable Objects - need D1 backup |
| **activity_log** | id, action_type, actor_email, actor_name, target_type, target_id, target_title, details, related_users[], created_at | ❌ MISSING | Add to D1 schema |
| **auth_rate_limits** | id, identifier, action_type, attempt_count, first_attempt_at, last_attempt_at, blocked_until | ❌ MISSING | Add to D1 schema |
| **password_reset_tracking** | id, email, requested_at, ip_address, user_agent, completed_at | ❌ MISSING | May not need with SSO |
| **security_audit_log** | id, event_type, user_email, ip_address, user_agent, details, created_at | ❌ MISSING | Add to D1 schema |
| **managers** | (implied) | ❌ MISSING | Consider separate table or role in users |

### Required D1 Schema Additions

```sql
-- Workstreams
CREATE TABLE workstreams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT REFERENCES users(id),
    owner_email TEXT NOT NULL,
    visibility TEXT DEFAULT 'personal', -- 'personal' | 'shared'
    color TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Workstream Tasks
CREATE TABLE workstream_tasks (
    id TEXT PRIMARY KEY,
    workstream_id TEXT REFERENCES workstreams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'high' | 'medium' | 'low'
    status TEXT DEFAULT 'open', -- 'open' | 'in_progress' | 'done'
    assignee TEXT REFERENCES users(id),
    assignee_email TEXT,
    task_type TEXT, -- 'issue' | 'feature_request' | 'feature_improvement' | custom
    deadline TEXT,
    tags TEXT, -- JSON array
    linked_items TEXT, -- JSON array of UUIDs
    comments TEXT, -- JSON array
    attachments TEXT, -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Habits
CREATE TABLE habits (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily', -- 'daily' | 'weekly'
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
    quadrant TEXT NOT NULL, -- 'do' | 'schedule' | 'delegate' | 'eliminate'
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Whiteboard Elements (backup/persistence layer)
CREATE TABLE whiteboard_elements (
    id TEXT PRIMARY KEY,
    whiteboard_id TEXT REFERENCES whiteboards(id) ON DELETE CASCADE,
    element_type TEXT NOT NULL, -- 'sticky' | 'text' | 'image' | 'connector' | 'shape'
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL,
    height REAL,
    rotation REAL DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    content TEXT, -- JSON for element-specific data
    background_color TEXT,
    border_color TEXT,
    text_color TEXT,
    locked_by TEXT,
    locked_at TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Activity Log
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL, -- 'created' | 'updated' | 'deleted' | 'status_changed' | 'comment_added' | etc
    actor_id TEXT REFERENCES users(id),
    actor_email TEXT NOT NULL,
    actor_name TEXT,
    target_type TEXT NOT NULL, -- 'workflow_item' | 'subtask' | 'comment' | 'user_profile' | etc
    target_id TEXT,
    target_title TEXT,
    details TEXT, -- JSON
    related_users TEXT, -- JSON array of emails
    created_at TEXT DEFAULT (datetime('now'))
);

-- Security Audit Log
CREATE TABLE security_audit_log (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'login_failed' | 'rate_limited' | 'unauthorized_access'
    user_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now'))
);

-- Rate Limits (for Edge Functions)
CREATE TABLE rate_limits (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL, -- email or IP
    action_type TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TEXT NOT NULL,
    last_attempt_at TEXT NOT NULL,
    blocked_until TEXT,
    UNIQUE(identifier, action_type)
);

-- Update users table
ALTER TABLE users ADD COLUMN invited_at TEXT;
ALTER TABLE users ADD COLUMN invited_by TEXT;
ALTER TABLE users ADD COLUMN claimed_at TEXT;
ALTER TABLE users ADD COLUMN team TEXT;

-- Update whiteboards table
ALTER TABLE whiteboards ADD COLUMN owner_email TEXT;
ALTER TABLE whiteboards ADD COLUMN owner_name TEXT;
ALTER TABLE whiteboards ADD COLUMN canvas_width INTEGER DEFAULT 3000;
ALTER TABLE whiteboards ADD COLUMN canvas_height INTEGER DEFAULT 2000;
ALTER TABLE whiteboards ADD COLUMN background_color TEXT DEFAULT '#ffffff';
ALTER TABLE whiteboards ADD COLUMN grid_enabled INTEGER DEFAULT 1;
ALTER TABLE whiteboards ADD COLUMN is_shared INTEGER DEFAULT 0;
ALTER TABLE whiteboards ADD COLUMN shared_with TEXT; -- JSON array of emails
ALTER TABLE whiteboards ADD COLUMN share_mode TEXT DEFAULT 'view'; -- 'view' | 'edit'
ALTER TABLE whiteboards ADD COLUMN archived INTEGER DEFAULT 0;

-- Additional indexes
CREATE INDEX idx_workstreams_owner ON workstreams(owner_email);
CREATE INDEX idx_workstream_tasks_workstream ON workstream_tasks(workstream_id);
CREATE INDEX idx_workstream_tasks_assignee ON workstream_tasks(assignee_email);
CREATE INDEX idx_habits_user ON habits(user_email);
CREATE INDEX idx_habit_completions_habit ON habit_completions(habit_id);
CREATE INDEX idx_habit_completions_date ON habit_completions(completed_date);
CREATE INDEX idx_matrix_tasks_user ON matrix_tasks(user_email);
CREATE INDEX idx_whiteboard_elements_whiteboard ON whiteboard_elements(whiteboard_id);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_email);
CREATE INDEX idx_activity_log_target ON activity_log(target_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at);
```

---

## 2. Authentication Features

### Current Auth Flow vs Cloudflare Access

| Feature | Current (Supabase) | Cloudflare | Migration Action |
|---------|-------------------|------------|------------------|
| **Email/Password Sign-in** | `auth.signInWithPassword()` | ❌ Not supported | Replace with SSO redirect |
| **Email/Password Sign-up** | `auth.signUp()` | ❌ Not supported | Replace with SSO + invite flow |
| **Password Reset** | `auth.resetPasswordForEmail()` | ❌ Not supported | Users reset via Azure AD portal |
| **Email Confirmation** | Supabase handles | ❌ Not needed | Azure AD handles verification |
| **Magic Link** | Supported | ❌ Not supported | Not needed with SSO |
| **SSO (Azure AD)** | Not currently used | ✅ Cloudflare Access | Primary auth method |
| **Session Persistence** | `persistSession: true` | ✅ CF Access cookies | Automatic 24h sessions |
| **Token Refresh** | `autoRefreshToken: true` | ✅ CF Access handles | Automatic |
| **User Invites** | Edge Function + email | ⚠️ Need alternative | Pre-provision in Azure AD or D1 |
| **Rate Limiting** | `auth_rate_limits` table | ⚠️ Partial | CF rate limiting + D1 tracking |

### Auth Transition Plan

**Phase 1: SSO Only**
- Remove email/password forms from LoginScreen
- Redirect to Cloudflare Access login
- Access redirects to Azure AD
- On callback, provision user in D1 if not exists

**Phase 2: Invite Flow**
- Admin adds user email to D1 `users` table with `invited_at` timestamp
- When user authenticates via Azure AD, check if email is pre-authorized
- If not in users table, show "Contact admin for access" message
- Mark `claimed_at` when user first logs in

**Phase 3: Role Management**
- Roles stored in D1 `users.role` column
- Admin Console manages roles via Workers API
- CF Access policies can use Azure AD groups for additional control

### LoginScreen Changes Required

```jsx
// BEFORE: Email/password form
// AFTER: Simple SSO redirect

const LoginScreen = () => {
  // Check if already authenticated via CF Access
  useEffect(() => {
    // CF Access cookie present = authenticated
    // Redirect to dashboard
  }, []);

  return (
    <div className="login-container">
      <h1>Momentum Hub</h1>
      <p>Sign in with your organization account</p>
      <button onClick={() => {
        // Trigger CF Access login flow
        window.location.href = '/.auth/login';
      }}>
        Sign in with Microsoft
      </button>
    </div>
  );
};
```

---

## 3. Real-time Features

### Current vs Cloudflare

| Feature | Current (Supabase) | Cloudflare | Migration Action |
|---------|-------------------|------------|------------------|
| **Whiteboard Sync** | Postgres LISTEN/NOTIFY via Realtime | ✅ Durable Objects WebSocket | Already planned |
| **Whiteboard Elements** | `whiteboard_elements` table + Realtime | ✅ DO state + D1 backup | Add D1 persistence layer |
| **Notifications** | Polling or Realtime | ⚠️ Need alternative | Polling or SSE from Worker |
| **Activity Feed** | Query `activity_log` | ✅ D1 query | Same approach |

### Whiteboard Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WHITEBOARD FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Browser ──WebSocket──► Durable Object (real-time state)    │
│     │                         │                              │
│     │                         │ periodic flush               │
│     │                         ▼                              │
│     └──REST API──────► Worker ──► D1 (persistent backup)    │
│                                                              │
│  On reconnect: Load from D1, then sync via DO               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. File Storage

### Current vs Cloudflare R2

| Feature | Current (Supabase Storage) | Cloudflare R2 | Migration Action |
|---------|---------------------------|---------------|------------------|
| **Upload** | `storage.upload()` | ✅ R2 PUT | Worker handles multipart |
| **Download** | `storage.download()` | ✅ R2 GET | Worker streams response |
| **Delete** | `storage.remove()` | ✅ R2 DELETE | Worker handles cleanup |
| **Allowed Types** | PDF, DOC, XLS, PNG, JPG, etc. | ✅ Same validation | Implement in Worker |
| **Size Limit** | Configurable | 10MB (can increase) | Same or higher |
| **Path Structure** | `{user_id}/{filename}` | `attachments/{item_id}/{id}/{filename}` | New structure |
| **Access Control** | RLS policies | ✅ Worker auth check | Verify user owns/collaborates |

### File Migration Script

```javascript
// Migration: Supabase Storage → R2
async function migrateFiles(supabase, r2, d1) {
  // 1. List all files in Supabase Storage
  const { data: files } = await supabase.storage.from('attachments').list();

  for (const file of files) {
    // 2. Download from Supabase
    const { data: blob } = await supabase.storage
      .from('attachments')
      .download(file.name);

    // 3. Determine item association (parse path or query DB)
    const itemId = await findItemForFile(file.name, d1);

    // 4. Upload to R2 with new path structure
    const newKey = `attachments/${itemId}/${file.id}/${file.name}`;
    await r2.put(newKey, blob);

    // 5. Update D1 attachments table
    await d1.prepare(`
      INSERT INTO attachments (id, item_id, filename, r2_key, content_type, size_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(file.id, itemId, file.name, newKey, file.metadata.mimetype, file.metadata.size).run();
  }
}
```

---

## 5. API Endpoints

### Current Supabase Operations → Workers API

| Operation | Current Pattern | Workers Endpoint | Notes |
|-----------|----------------|------------------|-------|
| **List workflow_items** | `supabase.from('workflow_items').select()` | `GET /api/items` | Add filter params |
| **Get single item** | `supabase.from('workflow_items').select().eq('id', id)` | `GET /api/items/:id` | Include relations |
| **Create item** | `supabase.from('workflow_items').insert()` | `POST /api/items` | Return created ID |
| **Update item** | `supabase.from('workflow_items').update().eq('id', id)` | `PUT /api/items/:id` | Partial updates |
| **Delete item** | `supabase.from('workflow_items').delete().eq('id', id)` | `DELETE /api/items/:id` | Soft delete option |
| **List workstreams** | `supabase.from('workstreams').select()` | `GET /api/workstreams` | Filter by visibility |
| **CRUD workstream_tasks** | Multiple queries | `GET/POST/PUT/DELETE /api/workstreams/:id/tasks` | Nested resource |
| **List personal_todos** | `supabase.from('personal_todos').select()` | `GET /api/todos` | User-scoped |
| **CRUD habits** | Multiple queries | `GET/POST/PUT/DELETE /api/habits` | User-scoped |
| **CRUD habit_completions** | Multiple queries | `GET/POST/DELETE /api/habits/:id/completions` | Nested resource |
| **CRUD matrix_tasks** | Multiple queries | `GET/POST/PUT/DELETE /api/matrix-tasks` | User-scoped |
| **List whiteboards** | `supabase.from('whiteboards').select()` | `GET /api/whiteboards` | Owner + shared_with |
| **CRUD whiteboard_elements** | Multiple queries | Via Durable Object WebSocket | REST fallback for backup |
| **List activity_log** | `supabase.from('activity_log').select()` | `GET /api/activity` | With pagination |
| **User profiles** | `supabase.from('user_profiles').select()` | `GET /api/users` | For @mentions |
| **File upload** | `supabase.storage.upload()` | `POST /api/files/upload` | Multipart form |
| **File download** | `supabase.storage.download()` | `GET /api/files/:id` | Stream response |

### Full API Specification

```yaml
# Workers API Endpoints

/api/items:
  GET:
    params: type, status, owner, workstream, archived, search
    returns: Item[]
  POST:
    body: { title, description, itemType, ... }
    returns: { id }

/api/items/{id}:
  GET:
    returns: Item with subtasks, comments, collaborators, attachments
  PUT:
    body: Partial<Item>
    returns: { updated: true }
  DELETE:
    returns: { deleted: true }

/api/items/{id}/subtasks:
  POST:
    body: { text, assignedTo?, deadline? }
    returns: { id }

/api/items/{id}/subtasks/{sid}:
  PUT:
    body: { completed?, text?, ... }
  DELETE:

/api/items/{id}/comments:
  POST:
    body: { text, mentions? }
    returns: { id }

/api/workstreams:
  GET:
    params: visibility
    returns: Workstream[]
  POST:
    body: { title, description, visibility, color }
    returns: { id }

/api/workstreams/{id}:
  GET:
    returns: Workstream with tasks
  PUT:
  DELETE:

/api/workstreams/{id}/tasks:
  GET:
    returns: WorkstreamTask[]
  POST:
    body: { title, priority, taskType, ... }
    returns: { id }

/api/workstreams/{id}/tasks/{tid}:
  PUT:
  DELETE:

/api/todos:
  GET:
    params: date
    returns: Todo[]
  POST:
    body: { text, date?, orderIndex? }
    returns: { id }

/api/todos/{id}:
  PUT:
  DELETE:

/api/habits:
  GET:
    returns: Habit[]
  POST:
    body: { name, frequency, color }
    returns: { id }

/api/habits/{id}:
  PUT:
  DELETE:

/api/habits/{id}/completions:
  GET:
    params: startDate, endDate
    returns: HabitCompletion[]
  POST:
    body: { completedDate }
    returns: { id }
  DELETE:
    params: completedDate

/api/matrix-tasks:
  GET:
    returns: MatrixTask[]
  POST:
    body: { title, quadrant }
    returns: { id }

/api/matrix-tasks/{id}:
  PUT:
  DELETE:

/api/whiteboards:
  GET:
    params: filter (all|mine|shared)
    returns: Whiteboard[]
  POST:
    body: { title, description?, workflowItemId? }
    returns: { id }

/api/whiteboards/{id}:
  GET:
    returns: Whiteboard with elements (from D1 backup)
  PUT:
    body: { title?, shared_with?, share_mode?, ... }
  DELETE:

/api/whiteboard/{id}:
  WebSocket:
    upgrade: true
    handler: Durable Object

/api/activity:
  GET:
    params: type, limit, offset
    returns: ActivityLog[]

/api/users:
  GET:
    returns: User[] (for @mentions, assignments)

/api/users/me:
  GET:
    returns: Current user profile

/api/users/{id}:
  PUT:
    body: { role? } (admin only)

/api/files/upload:
  POST:
    body: multipart (file, itemId)
    returns: { id, filename, size }

/api/files/{id}:
  GET:
    returns: File stream
  DELETE:
```

---

## 6. RLS → Worker Authorization

### Current RLS Policies → Worker Middleware

| Resource | RLS Rule | Worker Implementation |
|----------|----------|----------------------|
| **workflow_items SELECT** | All authenticated | Allow all authenticated requests |
| **workflow_items INSERT** | owner = auth.email | `body.owner = user.id` |
| **workflow_items UPDATE** | owner OR collaborator OR admin | Check `isOwnerOrCollaborator(item, user)` |
| **workflow_items DELETE** | owner OR admin | Check `item.owner === user.id \|\| user.role === 'admin'` |
| **workstreams SELECT** | personal OR shared_with | `visibility = 'shared' OR owner = user.id OR shared_with.includes(user.email)` |
| **personal_todos** | user_email match | Always filter by `user_id = user.id` |
| **habits** | user_email match | Always filter by `user_id = user.id` |
| **matrix_tasks** | user_email match | Always filter by `user_id = user.id` |
| **whiteboards SELECT** | owner OR shared_with | Check ownership or sharing |
| **activity_log SELECT** | own OR admin | Filter by `actor_email` or allow if admin |
| **user_profiles SELECT** | All authenticated | Allow for @mentions |
| **user_profiles UPDATE** | self OR admin | `user.id === target.id \|\| user.role === 'admin'` |

### Authorization Middleware

```typescript
// src/middleware/authorize.ts

type Permission = 'read' | 'write' | 'delete' | 'admin';

interface AuthContext {
  user: User;
  resource: string;
  resourceId?: string;
  action: Permission;
}

export async function authorize(ctx: AuthContext, db: D1Database): Promise<boolean> {
  const { user, resource, resourceId, action } = ctx;

  // Admin bypasses most checks
  if (user.role === 'admin' && action !== 'delete') {
    return true;
  }

  switch (resource) {
    case 'workflow_items':
      return authorizeWorkflowItem(user, resourceId, action, db);

    case 'workstreams':
      return authorizeWorkstream(user, resourceId, action, db);

    case 'personal_todos':
    case 'habits':
    case 'matrix_tasks':
      // Always user-scoped
      return true; // Query already filtered by user_id

    case 'whiteboards':
      return authorizeWhiteboard(user, resourceId, action, db);

    case 'users':
      if (action === 'read') return true;
      if (action === 'write') {
        return user.id === resourceId || user.role === 'admin';
      }
      return user.role === 'admin';

    default:
      return false;
  }
}

async function authorizeWorkflowItem(
  user: User,
  itemId: string | undefined,
  action: Permission,
  db: D1Database
): Promise<boolean> {
  if (action === 'read') return true;
  if (!itemId) return action === 'write'; // Creating new item

  const item = await db.prepare(
    'SELECT owner, collaborators FROM workflow_items WHERE id = ?'
  ).bind(itemId).first();

  if (!item) return false;

  const isOwner = item.owner === user.id;
  const collaborators = JSON.parse(item.collaborators || '[]');
  const isCollaborator = collaborators.includes(user.email) || collaborators.includes(user.name);

  if (action === 'delete') {
    return isOwner || user.role === 'admin';
  }

  return isOwner || isCollaborator || user.role === 'admin';
}
```

---

## 7. Edge Functions → Workers

### Current Edge Functions vs Workers

| Edge Function | Purpose | Worker Equivalent |
|---------------|---------|-------------------|
| **invite-user** | Send invitation emails | `POST /api/admin/invite` |
| **delete-user** | Remove user accounts | `DELETE /api/admin/users/:id` |
| **delete-invite** | Revoke pending invites | `DELETE /api/admin/invites/:email` |
| **send-notification-email** | Send notification emails | `POST /api/notifications/email` |

### Worker Implementation

```typescript
// src/routes/admin.ts

export const adminRouter = new Hono<{ Bindings: Env }>();

// Admin-only middleware
adminRouter.use('*', async (c, next) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  await next();
});

// Invite user
adminRouter.post('/invite', async (c) => {
  const { email, name, team, role } = await c.req.json();
  const user = c.get('user');

  // Check rate limit
  const allowed = await checkRateLimit(c.env.DB, email, 'invite_user', 5, 60);
  if (!allowed) {
    return c.json({ error: 'Rate limited' }, 429);
  }

  // Check if already exists
  const existing = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first();

  if (existing?.claimed_at) {
    return c.json({ error: 'User already exists' }, 400);
  }

  // Create or update user record
  const id = existing?.id || crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, name, team, role, invited_at, invited_by)
    VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      team = excluded.team,
      role = excluded.role,
      invited_at = datetime('now'),
      invited_by = excluded.invited_by
  `).bind(id, email.toLowerCase(), name, team, role || 'member', user.email).run();

  // Send invitation email via Resend
  await sendInviteEmail(c.env, email, name, user.name);

  // Log activity
  await logActivity(c.env.DB, {
    actionType: 'user_invited',
    actorEmail: user.email,
    actorName: user.name,
    targetType: 'user_profile',
    targetId: id,
    targetTitle: email,
    details: { invitedRole: role }
  });

  return c.json({ success: true, id });
});

// Delete user
adminRouter.delete('/users/:id', async (c) => {
  const targetId = c.req.param('id');
  const user = c.get('user');

  // Check rate limit
  const allowed = await checkRateLimit(c.env.DB, user.email, 'delete_user', 10, 60);
  if (!allowed) {
    return c.json({ error: 'Rate limited' }, 429);
  }

  const target = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(targetId).first();

  if (!target) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Prevent self-deletion
  if (target.id === user.id) {
    return c.json({ error: 'Cannot delete yourself' }, 400);
  }

  // Delete user
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();

  // Log activity
  await logActivity(c.env.DB, {
    actionType: 'user_deleted',
    actorEmail: user.email,
    actorName: user.name,
    targetType: 'user_profile',
    targetId: targetId,
    targetTitle: target.email
  });

  return c.json({ deleted: true });
});
```

---

## 8. Data Migration Transformations

### Field-Level Mappings

| Supabase Field | Type | D1 Field | Type | Transformation |
|----------------|------|----------|------|----------------|
| `id` | UUID | `id` | TEXT | Direct copy |
| `created_at` | TIMESTAMPTZ | `created_at` | TEXT | `toISOString()` |
| `collaborators` | TEXT[] | `collaborators` | TEXT | `JSON.stringify()` |
| `tags` | TEXT[] | `tags` | TEXT | `JSON.stringify()` |
| `teams` | TEXT[] | `teams` | TEXT | `JSON.stringify()` |
| `dependencies` | JSONB | `dependencies` | TEXT | `JSON.stringify()` |
| `custom_fields` | JSONB | `custom_fields` | TEXT | `JSON.stringify()` |
| `attachments` | JSONB | `attachments` | TEXT | `JSON.stringify()` |
| `comments` | JSONB | `comments` | TEXT | `JSON.stringify()` |
| `documents` | JSONB | `documents` | TEXT | `JSON.stringify()` |
| `archived` | BOOLEAN | `archived` | INTEGER | `value ? 1 : 0` |
| `completed` | BOOLEAN | `completed` | INTEGER | `value ? 1 : 0` |
| `is_shared` | BOOLEAN | `is_shared` | INTEGER | `value ? 1 : 0` |
| `grid_enabled` | BOOLEAN | `grid_enabled` | INTEGER | `value ? 1 : 0` |

### Migration Script

```typescript
// scripts/migrate-data.ts

interface MigrationConfig {
  supabaseUrl: string;
  supabaseKey: string;
  d1Database: D1Database;
  r2Bucket: R2Bucket;
}

export async function migrateAllData(config: MigrationConfig) {
  const { supabaseUrl, supabaseKey, d1Database: db, r2Bucket: r2 } = config;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = {
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
    errors: [] as string[]
  };

  try {
    // 1. Migrate user_profiles → users
    console.log('Migrating users...');
    const { data: profiles } = await supabase.from('user_profiles').select('*');
    for (const profile of profiles || []) {
      await db.prepare(`
        INSERT INTO users (id, email, name, role, team, invited_at, invited_by, claimed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          role = excluded.role,
          team = excluded.team
      `).bind(
        crypto.randomUUID(),
        profile.email.toLowerCase(),
        profile.name,
        profile.role || 'member',
        profile.team,
        profile.invited_at,
        profile.invited_by,
        profile.claimed_at,
        profile.created_at || new Date().toISOString(),
        new Date().toISOString()
      ).run();
      results.users++;
    }

    // 2. Migrate workflow_items
    console.log('Migrating workflow items...');
    const { data: items } = await supabase.from('workflow_items').select('*');
    for (const item of items || []) {
      // Look up owner user ID
      const owner = await db.prepare('SELECT id FROM users WHERE email = ?')
        .bind(item.owner_email?.toLowerCase()).first();

      await db.prepare(`
        INSERT INTO workflow_items (
          id, title, description, item_type, workflow_status, priority,
          owner, date, deadline, timeline_value, timeline_unit,
          archived, parent_id, workstream_id, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        item.id,
        item.title,
        item.description,
        item.item_type || 'project',
        item.status || 'To Do',
        item.priority,
        owner?.id,
        item.date,
        item.deadline,
        item.timeline_value,
        item.timeline_unit,
        item.archived ? 1 : 0,
        item.parent_id,
        item.workstream_id,
        JSON.stringify({
          collaborators: item.collaborators || [],
          tags: item.tags || [],
          teams: item.teams || [],
          dependencies: item.dependencies || [],
          customFields: item.custom_fields || {},
          attachments: item.attachments || [],
          comments: item.comments || [],
          documents: item.documents || []
        }),
        item.created_at || new Date().toISOString(),
        item.updated_at || new Date().toISOString()
      ).run();
      results.workflowItems++;
    }

    // Continue for all other tables...
    // (Similar pattern for workstreams, workstream_tasks, habits, etc.)

    console.log('Migration complete:', results);
    return results;

  } catch (error) {
    results.errors.push(error.message);
    console.error('Migration error:', error);
    return results;
  }
}
```

---

## 9. Verification Checklist

### Phase-by-Phase Verification

#### Phase 1: Infrastructure
- [ ] `wrangler d1 execute momentum-hub --command "SELECT COUNT(*) FROM users"` returns 0
- [ ] `wrangler r2 object list momentum-hub-files` works
- [ ] `curl https://api.momentum-hub.com/health` returns `{"status":"ok"}`

#### Phase 2: Authentication
- [ ] Navigate to app → redirected to Azure AD
- [ ] Complete Azure AD login → redirected back with session
- [ ] `GET /api/users/me` returns current user
- [ ] New user first login → user created in D1
- [ ] Unauthorized user (not in D1) → shows access denied message

#### Phase 3: Core API
- [ ] `POST /api/items` creates item, returns ID
- [ ] `GET /api/items` returns list (filtered by auth)
- [ ] `PUT /api/items/:id` updates item (owner/collaborator only)
- [ ] `DELETE /api/items/:id` removes item (owner only)
- [ ] Same tests for `/api/workstreams`, `/api/todos`, `/api/habits`, `/api/matrix-tasks`

#### Phase 4: File Storage
- [ ] Upload 1MB file → stored in R2, record in D1
- [ ] Download file → correct content
- [ ] Upload 15MB file → rejected (over limit)
- [ ] Upload .exe file → rejected (blocked type)
- [ ] Delete file → removed from R2 and D1

#### Phase 5: Whiteboards
- [ ] Create whiteboard → D1 record created
- [ ] Connect WebSocket → receives `init` message with empty elements
- [ ] Draw element → other clients receive `element_added`
- [ ] Disconnect and reconnect → state restored from D1 backup
- [ ] Share whiteboard → recipient can connect

#### Phase 6: Frontend
- [ ] App loads from Pages URL
- [ ] All views render without errors
- [ ] CRUD operations work through new API
- [ ] Whiteboard collaboration works
- [ ] File upload/download works

#### Phase 7: Data Migration
- [ ] User count matches: `SELECT COUNT(*) FROM users` = Supabase count
- [ ] Item count matches: `SELECT COUNT(*) FROM workflow_items` = Supabase count
- [ ] Sample 10 random items → data matches source
- [ ] All files migrated: R2 object count = Supabase storage count
- [ ] Rollback tested: Can restore Supabase if needed

---

## 10. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | Critical | Full backups, validation queries, staged rollout |
| Auth disruption (users locked out) | Medium | High | Keep Supabase auth as fallback for 2 weeks |
| Missing feature discovered late | Medium | Medium | This feature matrix + testing in staging |
| Performance degradation | Low | Medium | Load testing, D1 query optimization |
| Whiteboard data loss | Medium | High | D1 backup layer + periodic snapshots |
| File migration incomplete | Low | Medium | Checksum verification, count validation |

---

## Summary

### Tables to Add to D1 Schema
1. `workstreams`
2. `workstream_tasks`
3. `habits`
4. `habit_completions`
5. `matrix_tasks`
6. `whiteboard_elements` (backup layer)
7. `activity_log`
8. `security_audit_log`
9. `rate_limits`

### Auth Changes Required
1. Remove email/password forms
2. Implement CF Access redirect flow
3. Add pre-authorization check for new users
4. Migrate invite system to D1 + Workers

### API Endpoints to Add
1. `/api/workstreams/*` - Full CRUD
2. `/api/habits/*` - Full CRUD with completions
3. `/api/matrix-tasks/*` - Full CRUD
4. `/api/activity` - Read with filters
5. `/api/admin/*` - Invite, delete, role management

### Migration Scripts Needed
1. User profiles migration
2. Workflow items with JSON field transformation
3. Workstreams and tasks migration
4. Productivity tools migration (habits, matrix)
5. Whiteboards and elements migration
6. Activity log migration
7. File migration (Supabase Storage → R2)
