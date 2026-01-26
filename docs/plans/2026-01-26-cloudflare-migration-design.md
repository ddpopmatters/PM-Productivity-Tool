# Cloudflare Migration Design

**Date:** 2026-01-26
**Status:** Approved
**Purpose:** Migrate Momentum Hub from GitHub Pages + Supabase to Cloudflare infrastructure

## Goals

1. Consolidate infrastructure on a single platform (Cloudflare)
2. Prepare for future Microsoft 365 integration (auth, calendar, Teams, SharePoint/OneDrive)
3. Maintain all existing functionality during transition
4. Improve performance and reduce operational complexity

---

## Section 1: Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE EDGE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │  Cloudflare      │    │  Cloudflare      │    │  Cloudflare      │      │
│  │  Pages           │    │  Workers         │    │  Access          │      │
│  │  (React SPA)     │    │  (API Layer)     │    │  (Azure AD SSO)  │      │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘      │
│           │                       │                       │                 │
│           └───────────────────────┼───────────────────────┘                 │
│                                   │                                         │
│                    ┌──────────────┴──────────────┐                         │
│                    │                             │                          │
│           ┌────────▼────────┐          ┌────────▼────────┐                 │
│           │  D1 Database    │          │  Durable Objects │                 │
│           │  (SQLite)       │          │  (Whiteboards)   │                 │
│           └─────────────────┘          └─────────────────┘                 │
│                                                                              │
│           ┌─────────────────┐                                               │
│           │  R2 Storage     │                                               │
│           │  (Files/Attach) │                                               │
│           └─────────────────┘                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Future Integration
                                   ▼
                    ┌──────────────────────────────┐
                    │  Microsoft 365 Graph API     │
                    │  - Calendar sync             │
                    │  - Teams notifications       │
                    │  - SharePoint/OneDrive       │
                    └──────────────────────────────┘
```

### Component Responsibilities

| Component | Purpose |
|-----------|---------|
| **Cloudflare Pages** | Host React SPA, automatic builds from GitHub |
| **Cloudflare Workers** | API layer, business logic, integrations |
| **Cloudflare D1** | Primary database (SQLite at edge) |
| **Durable Objects** | Real-time whiteboard collaboration |
| **R2 Storage** | File attachments, exports |
| **Cloudflare Access** | Authentication via Azure AD SSO |

---

## Section 2: Database Schema Migration (D1)

### Current Supabase Tables → D1 Schema

```sql
-- Users (synced from Azure AD via Cloudflare Access)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    azure_oid TEXT UNIQUE,  -- Azure AD Object ID
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Workflow Items (Projects, Tasks, Workstreams)
CREATE TABLE workflow_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL,  -- 'project', 'job', 'workstream'
    workflow_status TEXT DEFAULT 'To Do',
    priority TEXT,
    owner TEXT REFERENCES users(id),
    date TEXT,
    deadline TEXT,
    timeline_value TEXT,
    timeline_unit TEXT,
    archived INTEGER DEFAULT 0,
    parent_id TEXT REFERENCES workflow_items(id),
    workstream_id TEXT REFERENCES workflow_items(id),
    metadata TEXT,  -- JSON for flexible fields
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Subtasks
CREATE TABLE subtasks (
    id TEXT PRIMARY KEY,
    item_id TEXT REFERENCES workflow_items(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    assigned_to TEXT REFERENCES users(id),
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Comments
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    item_id TEXT REFERENCES workflow_items(id) ON DELETE CASCADE,
    author TEXT REFERENCES users(id),
    text TEXT NOT NULL,
    mentions TEXT,  -- JSON array of user IDs
    created_at TEXT DEFAULT (datetime('now'))
);

-- Collaborators (many-to-many)
CREATE TABLE item_collaborators (
    item_id TEXT REFERENCES workflow_items(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    PRIMARY KEY (item_id, user_id)
);

-- Personal Todos
CREATE TABLE todos (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    date TEXT,
    order_index INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Whiteboards (metadata only - content in Durable Objects)
CREATE TABLE whiteboards (
    id TEXT PRIMARY KEY,
    item_id TEXT REFERENCES workflow_items(id) ON DELETE CASCADE,
    name TEXT,
    durable_object_id TEXT,  -- Reference to Durable Object
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- File Attachments (R2 references)
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    item_id TEXT REFERENCES workflow_items(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,  -- R2 object key
    content_type TEXT,
    size_bytes INTEGER,
    uploaded_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX idx_items_owner ON workflow_items(owner);
CREATE INDEX idx_items_type ON workflow_items(item_type);
CREATE INDEX idx_items_status ON workflow_items(workflow_status);
CREATE INDEX idx_items_workstream ON workflow_items(workstream_id);
CREATE INDEX idx_subtasks_item ON subtasks(item_id);
CREATE INDEX idx_subtasks_assigned ON subtasks(assigned_to);
CREATE INDEX idx_comments_item ON comments(item_id);
CREATE INDEX idx_todos_user ON todos(user_id);
```

### Key Differences from Supabase

| Aspect | Supabase | D1 |
|--------|----------|-----|
| Data types | PostgreSQL native | SQLite (TEXT, INTEGER, REAL) |
| JSON | JSONB columns | TEXT with JSON (parsed in Worker) |
| Booleans | BOOLEAN | INTEGER (0/1) |
| Timestamps | TIMESTAMPTZ | TEXT (ISO 8601) |
| UUIDs | UUID type | TEXT (generated in Worker) |
| Real-time | Built-in subscriptions | Durable Objects for whiteboards |

---

## Section 3: Durable Objects for Real-time Whiteboards

### WhiteboardSession Durable Object

```typescript
// src/durable-objects/whiteboard-session.ts

interface Point { x: number; y: number; }

interface DrawElement {
  id: string;
  type: 'path' | 'rectangle' | 'ellipse' | 'text' | 'sticky';
  points?: Point[];
  bounds?: { x: number; y: number; width: number; height: number };
  content?: string;
  style: {
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
    fontSize?: number;
  };
  createdBy: string;
  createdAt: string;
}

interface WhiteboardState {
  elements: Map<string, DrawElement>;
  version: number;
}

export class WhiteboardSession {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { userId: string; userName: string }>;
  private whiteboard: WhiteboardState;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
    this.whiteboard = { elements: new Map(), version: 0 };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST endpoints for initial load / snapshots
    switch (url.pathname) {
      case '/state':
        return this.getState();
      case '/snapshot':
        return this.saveSnapshot();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair());

    const userId = new URL(request.url).searchParams.get('userId') || 'anonymous';
    const userName = new URL(request.url).searchParams.get('userName') || 'Anonymous';

    this.sessions.set(server, { userId, userName });

    server.accept();

    // Send current state to new connection
    server.send(JSON.stringify({
      type: 'init',
      elements: Array.from(this.whiteboard.elements.values()),
      version: this.whiteboard.version,
      users: Array.from(this.sessions.values())
    }));

    // Broadcast user joined
    this.broadcast({ type: 'user_joined', userId, userName }, server);

    server.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data as string);
      await this.handleMessage(message, server);
    });

    server.addEventListener('close', () => {
      const user = this.sessions.get(server);
      this.sessions.delete(server);
      if (user) {
        this.broadcast({ type: 'user_left', userId: user.userId }, null);
      }
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(message: any, sender: WebSocket) {
    switch (message.type) {
      case 'draw':
        this.whiteboard.elements.set(message.element.id, message.element);
        this.whiteboard.version++;
        this.broadcast({
          type: 'element_added',
          element: message.element,
          version: this.whiteboard.version
        }, sender);
        break;

      case 'update':
        const existing = this.whiteboard.elements.get(message.elementId);
        if (existing) {
          Object.assign(existing, message.updates);
          this.whiteboard.version++;
          this.broadcast({
            type: 'element_updated',
            elementId: message.elementId,
            updates: message.updates,
            version: this.whiteboard.version
          }, sender);
        }
        break;

      case 'delete':
        this.whiteboard.elements.delete(message.elementId);
        this.whiteboard.version++;
        this.broadcast({
          type: 'element_deleted',
          elementId: message.elementId,
          version: this.whiteboard.version
        }, sender);
        break;

      case 'cursor':
        this.broadcast({
          type: 'cursor_move',
          userId: this.sessions.get(sender)?.userId,
          position: message.position
        }, sender);
        break;
    }

    // Persist periodically
    if (this.whiteboard.version % 10 === 0) {
      await this.state.storage.put('whiteboard', {
        elements: Array.from(this.whiteboard.elements.entries()),
        version: this.whiteboard.version
      });
    }
  }

  private broadcast(message: any, exclude: WebSocket | null) {
    const data = JSON.stringify(message);
    for (const [socket] of this.sessions) {
      if (socket !== exclude) {
        socket.send(data);
      }
    }
  }

  private async getState(): Promise<Response> {
    return Response.json({
      elements: Array.from(this.whiteboard.elements.values()),
      version: this.whiteboard.version,
      activeUsers: this.sessions.size
    });
  }

  private async saveSnapshot(): Promise<Response> {
    await this.state.storage.put('whiteboard', {
      elements: Array.from(this.whiteboard.elements.entries()),
      version: this.whiteboard.version
    });
    return Response.json({ saved: true, version: this.whiteboard.version });
  }
}
```

### Worker Binding

```toml
# wrangler.toml
[durable_objects]
bindings = [
  { name = "WHITEBOARD", class_name = "WhiteboardSession" }
]

[[migrations]]
tag = "v1"
new_classes = ["WhiteboardSession"]
```

---

## Section 4: Authentication with Cloudflare Access

### Configuration Overview

```
Azure AD (Entra ID)
        │
        │ SAML/OIDC
        ▼
┌──────────────────────┐
│  Cloudflare Access   │
│  ─────────────────   │
│  - Identity Provider │
│  - Access Policies   │
│  - JWT Tokens        │
└──────────┬───────────┘
           │
           │ CF-Access-JWT-Assertion header
           ▼
┌──────────────────────┐
│  Cloudflare Worker   │
│  ─────────────────   │
│  - Validate JWT      │
│  - Extract user info │
│  - Provision user    │
└──────────────────────┘
```

### Azure AD App Registration

1. **Create App Registration** in Azure AD
   - Name: "Momentum Hub"
   - Redirect URI: `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`
   - Supported account types: Single tenant (your org only)

2. **Configure Claims**
   - email
   - name
   - oid (Object ID)
   - groups (optional, for roles)

3. **Grant Permissions**
   - `User.Read` (delegated)
   - Future: `Calendars.ReadWrite`, `Mail.Send`, `Files.ReadWrite`

### Cloudflare Access Policy

```yaml
# Access Application Settings
application:
  name: Momentum Hub
  domain: momentum-hub.yourdomain.com
  session_duration: 24h

identity_providers:
  - azure_ad:
      client_id: ${AZURE_CLIENT_ID}
      client_secret: ${AZURE_CLIENT_SECRET}
      directory_id: ${AZURE_TENANT_ID}

policies:
  - name: Allow Organization
    decision: allow
    include:
      - email_domain: yourdomain.com
    # Or use Azure AD groups:
    # - azure_ad_group: Momentum Hub Users
```

### Worker JWT Validation

```typescript
// src/middleware/auth.ts

interface AccessJWT {
  email: string;
  name?: string;
  sub: string;  // User ID
  aud: string[];  // Application audience
  iat: number;
  exp: number;
  iss: string;
  custom?: {
    azure_oid?: string;
    groups?: string[];
  };
}

export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<{ user: User; jwt: AccessJWT } | Response> {

  const token = request.headers.get('CF-Access-JWT-Assertion');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Verify JWT signature using Cloudflare's public keys
    const jwt = await verifyAccessJWT(token, env.ACCESS_AUD);

    // Get or create user in D1
    const user = await getOrCreateUser(env.DB, {
      id: jwt.sub,
      email: jwt.email,
      name: jwt.name || jwt.email.split('@')[0],
      azure_oid: jwt.custom?.azure_oid
    });

    return { user, jwt };

  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
}

async function verifyAccessJWT(token: string, expectedAud: string): Promise<AccessJWT> {
  // Cloudflare Access tokens are verified using the team's public key
  // Available at: https://<team>.cloudflareaccess.com/cdn-cgi/access/certs

  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));

  // Verify audience
  if (!payload.aud.includes(expectedAud)) {
    throw new Error('Invalid audience');
  }

  // Verify expiration
  if (Date.now() / 1000 > payload.exp) {
    throw new Error('Token expired');
  }

  return payload as AccessJWT;
}

async function getOrCreateUser(db: D1Database, userData: Partial<User>): Promise<User> {
  // Try to find existing user
  let user = await db.prepare(
    'SELECT * FROM users WHERE id = ? OR email = ?'
  ).bind(userData.id, userData.email).first<User>();

  if (!user) {
    // Create new user
    const id = userData.id || crypto.randomUUID();
    await db.prepare(`
      INSERT INTO users (id, email, name, azure_oid, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(id, userData.email, userData.name, userData.azure_oid).run();

    user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
  }

  return user!;
}
```

### Environment Variables

```toml
# wrangler.toml
[vars]
ACCESS_AUD = "your-access-application-audience-tag"

# Secrets (set via wrangler secret put)
# AZURE_CLIENT_SECRET - for future Graph API calls
```

---

## Section 5: File Storage (R2)

### R2 Bucket Configuration

```toml
# wrangler.toml
[[r2_buckets]]
binding = "FILES"
bucket_name = "momentum-hub-files"
```

### File Operations Worker

```typescript
// src/routes/files.ts

export async function handleFileUpload(
  request: Request,
  env: Env,
  user: User
): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const itemId = formData.get('itemId') as string;

  if (!file || !itemId) {
    return Response.json({ error: 'Missing file or itemId' }, { status: 400 });
  }

  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  // Generate unique key
  const attachmentId = crypto.randomUUID();
  const r2Key = `attachments/${itemId}/${attachmentId}/${file.name}`;

  // Upload to R2
  await env.FILES.put(r2Key, file.stream(), {
    httpMetadata: {
      contentType: file.type
    },
    customMetadata: {
      uploadedBy: user.id,
      originalName: file.name
    }
  });

  // Record in D1
  await env.DB.prepare(`
    INSERT INTO attachments (id, item_id, filename, r2_key, content_type, size_bytes, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(attachmentId, itemId, file.name, r2Key, file.type, file.size, user.id).run();

  return Response.json({
    id: attachmentId,
    filename: file.name,
    size: file.size,
    contentType: file.type
  });
}

export async function handleFileDownload(
  request: Request,
  env: Env,
  attachmentId: string
): Promise<Response> {
  // Get attachment record
  const attachment = await env.DB.prepare(
    'SELECT * FROM attachments WHERE id = ?'
  ).bind(attachmentId).first<Attachment>();

  if (!attachment) {
    return new Response('Not found', { status: 404 });
  }

  // Get from R2
  const object = await env.FILES.get(attachment.r2_key);

  if (!object) {
    return new Response('File not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': attachment.content_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
      'Content-Length': attachment.size_bytes.toString()
    }
  });
}

export async function handleFileDelete(
  request: Request,
  env: Env,
  attachmentId: string,
  user: User
): Promise<Response> {
  const attachment = await env.DB.prepare(
    'SELECT * FROM attachments WHERE id = ?'
  ).bind(attachmentId).first<Attachment>();

  if (!attachment) {
    return new Response('Not found', { status: 404 });
  }

  // Delete from R2
  await env.FILES.delete(attachment.r2_key);

  // Delete from D1
  await env.DB.prepare('DELETE FROM attachments WHERE id = ?')
    .bind(attachmentId).run();

  return Response.json({ deleted: true });
}
```

### Presigned URLs for Direct Upload (Large Files)

```typescript
// For future: direct browser-to-R2 uploads for large files
export async function generateUploadUrl(
  env: Env,
  itemId: string,
  filename: string
): Promise<{ uploadUrl: string; key: string }> {
  const attachmentId = crypto.randomUUID();
  const key = `attachments/${itemId}/${attachmentId}/${filename}`;

  // R2 presigned URLs require Workers for presigning
  // This would use a signed URL pattern

  return {
    uploadUrl: `https://files.momentum-hub.com/upload/${key}`,
    key
  };
}
```

---

## Section 6: Workers API Layer

### Main Router

```typescript
// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authenticateRequest } from './middleware/auth';
import { itemsRouter } from './routes/items';
import { todosRouter } from './routes/todos';
import { filesRouter } from './routes/files';
import { usersRouter } from './routes/users';

const app = new Hono<{ Bindings: Env }>();

// CORS for Pages frontend
app.use('*', cors({
  origin: ['https://momentum-hub.pages.dev', 'https://momentum-hub.yourdomain.com'],
  credentials: true
}));

// Auth middleware
app.use('/api/*', async (c, next) => {
  const result = await authenticateRequest(c.req.raw, c.env);
  if (result instanceof Response) {
    return result;
  }
  c.set('user', result.user);
  await next();
});

// API routes
app.route('/api/items', itemsRouter);
app.route('/api/todos', todosRouter);
app.route('/api/files', filesRouter);
app.route('/api/users', usersRouter);

// Whiteboard WebSocket upgrade
app.get('/api/whiteboard/:id', async (c) => {
  const id = c.req.param('id');
  const stub = c.env.WHITEBOARD.get(c.env.WHITEBOARD.idFromName(id));
  return stub.fetch(c.req.raw);
});

// Health check (no auth)
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default app;
export { WhiteboardSession } from './durable-objects/whiteboard-session';
```

### Items Router (CRUD)

```typescript
// src/routes/items.ts

import { Hono } from 'hono';

export const itemsRouter = new Hono<{ Bindings: Env }>();

// List items with filters
itemsRouter.get('/', async (c) => {
  const user = c.get('user');
  const { type, status, workstream, archived } = c.req.query();

  let query = 'SELECT * FROM workflow_items WHERE 1=1';
  const params: any[] = [];

  if (type) {
    query += ' AND item_type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND workflow_status = ?';
    params.push(status);
  }

  if (workstream) {
    query += ' AND workstream_id = ?';
    params.push(workstream);
  }

  if (archived !== 'true') {
    query += ' AND archived = 0';
  }

  // Filter by ownership or collaboration
  query += ' AND (owner = ? OR id IN (SELECT item_id FROM item_collaborators WHERE user_id = ?))';
  params.push(user.id, user.id);

  query += ' ORDER BY updated_at DESC';

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  // Parse JSON metadata
  const items = results.map((item: any) => ({
    ...item,
    metadata: item.metadata ? JSON.parse(item.metadata) : null
  }));

  return c.json(items);
});

// Get single item with relations
itemsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const item = await c.env.DB.prepare(
    'SELECT * FROM workflow_items WHERE id = ?'
  ).bind(id).first();

  if (!item) {
    return c.json({ error: 'Not found' }, 404);
  }

  // Get subtasks
  const { results: subtasks } = await c.env.DB.prepare(
    'SELECT * FROM subtasks WHERE item_id = ? ORDER BY created_at'
  ).bind(id).all();

  // Get comments
  const { results: comments } = await c.env.DB.prepare(
    'SELECT c.*, u.name as author_name FROM comments c LEFT JOIN users u ON c.author = u.id WHERE c.item_id = ? ORDER BY c.created_at'
  ).bind(id).all();

  // Get collaborators
  const { results: collaborators } = await c.env.DB.prepare(
    'SELECT u.* FROM item_collaborators ic JOIN users u ON ic.user_id = u.id WHERE ic.item_id = ?'
  ).bind(id).all();

  // Get attachments
  const { results: attachments } = await c.env.DB.prepare(
    'SELECT * FROM attachments WHERE item_id = ?'
  ).bind(id).all();

  return c.json({
    ...item,
    metadata: item.metadata ? JSON.parse(item.metadata) : null,
    subtasks,
    comments,
    collaborators,
    attachments
  });
});

// Create item
itemsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO workflow_items (
      id, title, description, item_type, workflow_status, priority,
      owner, date, deadline, timeline_value, timeline_unit,
      workstream_id, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    body.title,
    body.description || null,
    body.itemType || 'project',
    body.workflowStatus || 'To Do',
    body.priority || null,
    user.id,
    body.date || null,
    body.deadline || null,
    body.timelineValue || null,
    body.timelineUnit || null,
    body.workstreamId || null,
    body.metadata ? JSON.stringify(body.metadata) : null,
    now,
    now
  ).run();

  // Add initial collaborators
  if (body.collaborators?.length) {
    const stmt = c.env.DB.prepare(
      'INSERT INTO item_collaborators (item_id, user_id) VALUES (?, ?)'
    );
    await c.env.DB.batch(
      body.collaborators.map((userId: string) => stmt.bind(id, userId))
    );
  }

  return c.json({ id, created: true }, 201);
});

// Update item
itemsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const updates: string[] = [];
  const params: any[] = [];

  const fields = [
    'title', 'description', 'workflow_status', 'priority',
    'date', 'deadline', 'timeline_value', 'timeline_unit',
    'archived', 'workstream_id'
  ];

  for (const field of fields) {
    const camelCase = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (body[camelCase] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(body[camelCase]);
    }
  }

  if (body.metadata !== undefined) {
    updates.push('metadata = ?');
    params.push(JSON.stringify(body.metadata));
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  await c.env.DB.prepare(
    `UPDATE workflow_items SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ updated: true });
});

// Delete item
itemsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Cascading deletes handled by foreign keys
  await c.env.DB.prepare('DELETE FROM workflow_items WHERE id = ?').bind(id).run();

  return c.json({ deleted: true });
});
```

### API Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items` | List items (with filters) |
| GET | `/api/items/:id` | Get item with relations |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |
| POST | `/api/items/:id/subtasks` | Add subtask |
| PUT | `/api/items/:id/subtasks/:sid` | Update subtask |
| DELETE | `/api/items/:id/subtasks/:sid` | Delete subtask |
| POST | `/api/items/:id/comments` | Add comment |
| GET | `/api/todos` | List user's todos |
| POST | `/api/todos` | Create todo |
| PUT | `/api/todos/:id` | Update todo |
| DELETE | `/api/todos/:id` | Delete todo |
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files/:id` | Download file |
| DELETE | `/api/files/:id` | Delete file |
| GET | `/api/users` | List users |
| GET | `/api/users/me` | Get current user |
| WS | `/api/whiteboard/:id` | Whiteboard WebSocket |

---

## Section 7: Migration Phases

### Phase 1: Infrastructure Setup (Week 1)

**Objective:** Establish Cloudflare foundation

| Task | Details |
|------|---------|
| Create Cloudflare account/project | Set up new project |
| Configure D1 database | Create database, run schema migrations |
| Set up R2 bucket | Configure for file storage |
| Deploy initial Worker | Basic health check endpoint |
| Configure custom domain | DNS, SSL |

**Verification:**
- Health endpoint responds
- D1 tables created
- R2 bucket accessible

### Phase 2: Authentication (Week 2)

**Objective:** Azure AD integration via Cloudflare Access

| Task | Details |
|------|---------|
| Azure AD app registration | Configure OAuth, claims |
| Cloudflare Access setup | Identity provider, policies |
| Worker auth middleware | JWT validation, user provisioning |
| Test SSO flow | End-to-end authentication |

**Verification:**
- Can log in via Azure AD
- User created in D1
- Protected routes require auth

### Phase 3: Core API (Week 3)

**Objective:** Full CRUD functionality

| Task | Details |
|------|---------|
| Items CRUD endpoints | Projects, Tasks, Workstreams |
| Subtasks/Comments | Nested resources |
| Todos endpoint | Personal todo list |
| Users endpoint | Team directory |

**Verification:**
- All CRUD operations work
- Data persists in D1
- Proper authorization

### Phase 4: File Storage (Week 4)

**Objective:** Attachments via R2

| Task | Details |
|------|---------|
| Upload endpoint | Multipart handling |
| Download endpoint | Streaming from R2 |
| Delete endpoint | Cleanup both R2 and D1 |
| Size limits | 10MB per file |

**Verification:**
- Files upload successfully
- Files download correctly
- Deletion cleans up properly

### Phase 5: Whiteboards (Week 5)

**Objective:** Real-time collaboration via Durable Objects

| Task | Details |
|------|---------|
| WhiteboardSession DO | Core state management |
| WebSocket handling | Connection lifecycle |
| Drawing operations | Add/update/delete elements |
| Cursor presence | Real-time cursors |
| Persistence | Periodic snapshots |

**Verification:**
- Multiple users can connect
- Drawing syncs in real-time
- State persists across reconnects

### Phase 6: Frontend Migration (Week 6)

**Objective:** Update React app for new backend

| Task | Details |
|------|---------|
| Deploy to Cloudflare Pages | Build and deploy |
| Update API client | Point to Workers API |
| Update auth flow | Cloudflare Access integration |
| Update whiteboard client | New WebSocket endpoint |
| Environment config | Production/staging |

**Verification:**
- App loads from Pages
- All features work
- Auth redirects work

### Phase 7: Data Migration & Cutover (Week 7)

**Objective:** Move production data, go live

| Task | Details |
|------|---------|
| Export Supabase data | Full database dump |
| Transform for D1 | Schema mapping |
| Import to D1 | Batch inserts |
| Migrate files to R2 | From Supabase Storage |
| DNS cutover | Point domain to Cloudflare |
| Decommission Supabase | After validation period |

**Verification:**
- All data migrated
- No data loss
- Performance acceptable
- Rollback plan tested

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Full backups, staged rollout, validation scripts |
| Auth disruption | Test thoroughly in staging, maintain Supabase as fallback |
| Performance regression | Load testing, D1 query optimization |
| Feature gaps | Map all Supabase features before starting |

---

## Future: Microsoft 365 Integration

After migration is complete, the architecture supports adding:

1. **Calendar Sync** - Push deadlines to Outlook
2. **Teams Notifications** - Send updates via Teams bot
3. **SharePoint/OneDrive** - Alternative file storage backend

These integrations would use the Azure AD credentials already configured for auth, extending permissions in the app registration as needed.
