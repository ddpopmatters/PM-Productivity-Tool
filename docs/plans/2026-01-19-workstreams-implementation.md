# Workstreams Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Workstreams feature for managing ongoing work buckets with two-lane task management (time-sensitive and priority backlog).

**Architecture:** New `workstreams` and `workstream_tasks` tables in Supabase with RLS policies. New React components following existing patterns (sidebar nav item, list view, detail view, task detail panel). Deep integration with Dashboard, Calendar, and Mentions.

**Tech Stack:** Supabase (PostgreSQL), React (inline in index.html), Tailwind CSS, Lucide icons

---

## Task 1: Database Migration - Create Tables

**Files:**
- Create: `supabase/migrations/011_create_workstreams.sql`

**Step 1: Create the migration file**

```sql
-- Migration: Create Workstreams Feature
-- Adds workstreams and workstream_tasks tables for ongoing work management

-- Create workstreams table
CREATE TABLE IF NOT EXISTS workstreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal', 'shared')),
    color TEXT DEFAULT 'blue',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workstream_tasks table
CREATE TABLE IF NOT EXISTS workstream_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workstream_id UUID NOT NULL REFERENCES workstreams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    sort_order INTEGER DEFAULT 0,
    deadline DATE,
    assignee TEXT,
    assignee_email TEXT,
    requester TEXT,
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done')),
    linked_items UUID[] DEFAULT '{}',
    comments JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workstreams_owner ON workstreams(owner_email);
CREATE INDEX IF NOT EXISTS idx_workstreams_visibility ON workstreams(visibility);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_workstream ON workstream_tasks(workstream_id);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_assignee ON workstream_tasks(assignee_email);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_deadline ON workstream_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_workstream_tasks_priority ON workstream_tasks(priority);

-- Enable RLS
ALTER TABLE workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstream_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workstreams
-- Users can see: their own personal workstreams OR any shared workstreams
CREATE POLICY "Users can view accessible workstreams" ON workstreams
    FOR SELECT USING (
        visibility = 'shared' OR owner_email = auth.jwt()->>'email'
    );

CREATE POLICY "Users can insert their own workstreams" ON workstreams
    FOR INSERT WITH CHECK (
        owner_email = auth.jwt()->>'email'
    );

CREATE POLICY "Owners can update their workstreams" ON workstreams
    FOR UPDATE USING (
        owner_email = auth.jwt()->>'email'
    );

CREATE POLICY "Owners can delete their workstreams" ON workstreams
    FOR DELETE USING (
        owner_email = auth.jwt()->>'email'
    );

-- RLS Policies for workstream_tasks
-- Users can see tasks in workstreams they have access to
CREATE POLICY "Users can view tasks in accessible workstreams" ON workstream_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Users can insert tasks in accessible workstreams
CREATE POLICY "Users can insert tasks in accessible workstreams" ON workstream_tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Users can update tasks in accessible workstreams
CREATE POLICY "Users can update tasks in accessible workstreams" ON workstream_tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Users can delete tasks in accessible workstreams
CREATE POLICY "Users can delete tasks in accessible workstreams" ON workstream_tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workstreams w
            WHERE w.id = workstream_tasks.workstream_id
            AND (w.visibility = 'shared' OR w.owner_email = auth.jwt()->>'email')
        )
    );

-- Comments
COMMENT ON TABLE workstreams IS 'Ongoing work buckets for managing iterative work';
COMMENT ON TABLE workstream_tasks IS 'Tasks within workstreams with priority and deadline tracking';
```

**Step 2: Commit**

```bash
git add supabase/migrations/011_create_workstreams.sql
git commit -m "feat: add database migration for workstreams feature"
```

---

## Task 2: Add Supabase API Methods

**Files:**
- Modify: `index.html` (SUPABASE_API object, around line 958-1100)

**Step 1: Add workstream CRUD methods after existing methods**

Find the `SUPABASE_API` object (around line 959) and add these methods before the closing `};`:

```javascript
            // ============ WORKSTREAMS API ============

            // Fetch all accessible workstreams
            fetchWorkstreams: async () => {
                if (!supabase) return [];
                const { data, error } = await supabase
                    .from('workstreams')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) {
                    Logger.error(error, 'Supabase workstreams fetch error');
                    return [];
                }
                return data || [];
            },

            // Save new workstream
            saveWorkstream: async (workstream, userEmail) => {
                if (!supabase) return null;
                const { data, error } = await supabase
                    .from('workstreams')
                    .insert([{
                        title: workstream.title,
                        description: workstream.description || '',
                        owner: workstream.owner,
                        owner_email: userEmail,
                        visibility: workstream.visibility || 'personal',
                        color: workstream.color || 'blue'
                    }])
                    .select()
                    .single();
                if (error) {
                    Logger.error(error, 'Supabase workstream save error');
                    return null;
                }
                return data;
            },

            // Update workstream
            updateWorkstream: async (id, updates) => {
                if (!supabase) return null;
                const updateObj = { updated_at: new Date().toISOString() };
                if (updates.title !== undefined) updateObj.title = updates.title;
                if (updates.description !== undefined) updateObj.description = updates.description;
                if (updates.visibility !== undefined) updateObj.visibility = updates.visibility;
                if (updates.color !== undefined) updateObj.color = updates.color;

                const { data, error } = await supabase
                    .from('workstreams')
                    .update(updateObj)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) {
                    Logger.error(error, 'Supabase workstream update error');
                    return null;
                }
                return data;
            },

            // Delete workstream
            deleteWorkstream: async (id) => {
                if (!supabase) return false;
                const { error } = await supabase
                    .from('workstreams')
                    .delete()
                    .eq('id', id);
                if (error) {
                    Logger.error(error, 'Supabase workstream delete error');
                    return false;
                }
                return true;
            },

            // Fetch tasks for a workstream
            fetchWorkstreamTasks: async (workstreamId) => {
                if (!supabase) return [];
                const { data, error } = await supabase
                    .from('workstream_tasks')
                    .select('*')
                    .eq('workstream_id', workstreamId)
                    .order('sort_order', { ascending: true });
                if (error) {
                    Logger.error(error, 'Supabase workstream tasks fetch error');
                    return [];
                }
                return data || [];
            },

            // Fetch all tasks assigned to user (for dashboard)
            fetchMyWorkstreamTasks: async (userEmail) => {
                if (!supabase) return [];
                const { data, error } = await supabase
                    .from('workstream_tasks')
                    .select('*, workstreams!inner(title, color)')
                    .eq('assignee_email', userEmail)
                    .neq('status', 'done')
                    .order('deadline', { ascending: true, nullsFirst: false });
                if (error) {
                    Logger.error(error, 'Supabase my workstream tasks fetch error');
                    return [];
                }
                return data || [];
            },

            // Save new workstream task
            saveWorkstreamTask: async (task, userEmail) => {
                if (!supabase) return null;
                const { data, error } = await supabase
                    .from('workstream_tasks')
                    .insert([{
                        workstream_id: task.workstreamId,
                        title: task.title,
                        description: task.description || '',
                        priority: task.priority || 'medium',
                        sort_order: task.sortOrder || 0,
                        deadline: task.deadline || null,
                        assignee: task.assignee || null,
                        assignee_email: task.assigneeEmail || null,
                        requester: task.requester || null,
                        tags: task.tags || [],
                        status: task.status || 'open',
                        linked_items: task.linkedItems || [],
                        comments: task.comments || [],
                        attachments: task.attachments || []
                    }])
                    .select()
                    .single();
                if (error) {
                    Logger.error(error, 'Supabase workstream task save error');
                    return null;
                }
                return data;
            },

            // Update workstream task
            updateWorkstreamTask: async (id, updates) => {
                if (!supabase) return null;
                const updateObj = { updated_at: new Date().toISOString() };
                if (updates.title !== undefined) updateObj.title = updates.title;
                if (updates.description !== undefined) updateObj.description = updates.description;
                if (updates.priority !== undefined) updateObj.priority = updates.priority;
                if (updates.sortOrder !== undefined) updateObj.sort_order = updates.sortOrder;
                if (updates.deadline !== undefined) updateObj.deadline = updates.deadline;
                if (updates.assignee !== undefined) updateObj.assignee = updates.assignee;
                if (updates.assigneeEmail !== undefined) updateObj.assignee_email = updates.assigneeEmail;
                if (updates.requester !== undefined) updateObj.requester = updates.requester;
                if (updates.tags !== undefined) updateObj.tags = updates.tags;
                if (updates.status !== undefined) updateObj.status = updates.status;
                if (updates.linkedItems !== undefined) updateObj.linked_items = updates.linkedItems;
                if (updates.comments !== undefined) updateObj.comments = updates.comments;
                if (updates.attachments !== undefined) updateObj.attachments = updates.attachments;

                const { data, error } = await supabase
                    .from('workstream_tasks')
                    .update(updateObj)
                    .eq('id', id)
                    .select()
                    .single();
                if (error) {
                    Logger.error(error, 'Supabase workstream task update error');
                    return null;
                }
                return data;
            },

            // Delete workstream task
            deleteWorkstreamTask: async (id) => {
                if (!supabase) return false;
                const { error } = await supabase
                    .from('workstream_tasks')
                    .delete()
                    .eq('id', id);
                if (error) {
                    Logger.error(error, 'Supabase workstream task delete error');
                    return false;
                }
                return true;
            },

            // Batch update task sort orders (for drag-and-drop)
            updateTaskSortOrders: async (taskUpdates) => {
                if (!supabase) return false;
                // taskUpdates = [{ id, sortOrder, priority }, ...]
                for (const update of taskUpdates) {
                    const { error } = await supabase
                        .from('workstream_tasks')
                        .update({
                            sort_order: update.sortOrder,
                            priority: update.priority,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', update.id);
                    if (error) {
                        Logger.error(error, 'Supabase task sort update error');
                        return false;
                    }
                }
                return true;
            },
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add Supabase API methods for workstreams"
```

---

## Task 3: Add App State for Workstreams

**Files:**
- Modify: `index.html` (App component state declarations, around line 17694)

**Step 1: Find App component state declarations**

Locate `const [currentView, setCurrentView] = useState("dashboard");` (around line 17694) and add workstream state nearby:

```javascript
            // Workstreams state
            const [workstreams, setWorkstreams] = useState([]);
            const [workstreamTasks, setWorkstreamTasks] = useState({}); // { workstreamId: [tasks] }
            const [currentWorkstreamId, setCurrentWorkstreamId] = useState(null);
            const [currentWorkstreamTaskId, setCurrentWorkstreamTaskId] = useState(null);
```

**Step 2: Add data loading effect**

Find the existing useEffect that loads entries (search for `fetchWorkflowItems`) and add workstreams loading:

```javascript
            // Load workstreams
            useEffect(() => {
                const loadWorkstreams = async () => {
                    const data = await SUPABASE_API.fetchWorkstreams();
                    setWorkstreams(data);
                };
                if (userEmail) {
                    loadWorkstreams();
                }
            }, [userEmail]);
```

**Step 3: Add handler functions**

Add these handlers near other handlers (around line 19100-19300):

```javascript
            // Workstream handlers
            const handleCreateWorkstream = async (workstream) => {
                const saved = await SUPABASE_API.saveWorkstream(workstream, userEmail);
                if (saved) {
                    setWorkstreams(prev => [saved, ...prev]);
                    return saved;
                }
                return null;
            };

            const handleUpdateWorkstream = async (id, updates) => {
                const updated = await SUPABASE_API.updateWorkstream(id, updates);
                if (updated) {
                    setWorkstreams(prev => prev.map(w => w.id === id ? updated : w));
                    return updated;
                }
                return null;
            };

            const handleDeleteWorkstream = async (id) => {
                const success = await SUPABASE_API.deleteWorkstream(id);
                if (success) {
                    setWorkstreams(prev => prev.filter(w => w.id !== id));
                    if (currentWorkstreamId === id) {
                        setCurrentWorkstreamId(null);
                    }
                }
                return success;
            };

            const handleLoadWorkstreamTasks = async (workstreamId) => {
                const tasks = await SUPABASE_API.fetchWorkstreamTasks(workstreamId);
                setWorkstreamTasks(prev => ({ ...prev, [workstreamId]: tasks }));
                return tasks;
            };

            const handleCreateWorkstreamTask = async (task) => {
                const saved = await SUPABASE_API.saveWorkstreamTask(task, userEmail);
                if (saved) {
                    setWorkstreamTasks(prev => ({
                        ...prev,
                        [task.workstreamId]: [...(prev[task.workstreamId] || []), saved]
                    }));
                    return saved;
                }
                return null;
            };

            const handleUpdateWorkstreamTask = async (id, workstreamId, updates) => {
                const updated = await SUPABASE_API.updateWorkstreamTask(id, updates);
                if (updated) {
                    setWorkstreamTasks(prev => ({
                        ...prev,
                        [workstreamId]: (prev[workstreamId] || []).map(t => t.id === id ? updated : t)
                    }));
                    return updated;
                }
                return null;
            };

            const handleDeleteWorkstreamTask = async (id, workstreamId) => {
                const success = await SUPABASE_API.deleteWorkstreamTask(id);
                if (success) {
                    setWorkstreamTasks(prev => ({
                        ...prev,
                        [workstreamId]: (prev[workstreamId] || []).filter(t => t.id !== id)
                    }));
                }
                return success;
            };

            const handleReorderTasks = async (workstreamId, taskUpdates) => {
                // Optimistically update UI
                setWorkstreamTasks(prev => {
                    const tasks = prev[workstreamId] || [];
                    const updatedTasks = tasks.map(t => {
                        const update = taskUpdates.find(u => u.id === t.id);
                        return update ? { ...t, sort_order: update.sortOrder, priority: update.priority } : t;
                    });
                    return { ...prev, [workstreamId]: updatedTasks };
                });
                // Persist to database
                await SUPABASE_API.updateTaskSortOrders(taskUpdates);
            };
```

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add workstreams state and handlers to App component"
```

---

## Task 4: Add Workstreams to Sidebar Navigation

**Files:**
- Modify: `index.html` (Sidebar component, around line 5514)

**Step 1: Add workstreams menu item**

Find the `menuItems` array in Sidebar (around line 5514) and add workstreams:

```javascript
            const menuItems = [
                { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
                { id: 'personal', label: 'Your Projects', icon: 'folder' },
                { id: 'jobs', label: 'Jobs', icon: 'clipboard-list' },
                { id: 'workstreams', label: 'Workstreams', icon: 'layers' },
                // Manager Hub only visible to managers and admins
                ...(userIsManager || userIsAdmin ? [{ id: 'manager-hub', label: 'Manager Hub', icon: 'briefcase' }] : []),
                { id: 'todo', label: 'To-Do List', icon: 'check-square' },
                { id: 'whiteboards', label: 'Whiteboards', icon: 'layout' },
                { id: 'productivity-tools', label: 'Productivity Tools', icon: 'wrench' }
            ];
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add Workstreams to sidebar navigation"
```

---

## Task 5: Create WorkstreamList Component

**Files:**
- Modify: `index.html` (add new component before App component, around line 17500)

**Step 1: Add WorkstreamList component**

```javascript
        // ============ WORKSTREAMS COMPONENTS ============

        function WorkstreamList({ workstreams, currentUser, userEmail, onOpenWorkstream, onCreateWorkstream }) {
            const [showNewForm, setShowNewForm] = useState(false);
            const [newTitle, setNewTitle] = useState('');
            const [newDescription, setNewDescription] = useState('');
            const [newVisibility, setNewVisibility] = useState('personal');
            const [newColor, setNewColor] = useState('blue');
            const [filter, setFilter] = useState('all'); // all, personal, shared

            const colors = [
                { id: 'blue', bg: 'bg-blue-500', light: 'bg-blue-100' },
                { id: 'green', bg: 'bg-green-500', light: 'bg-green-100' },
                { id: 'purple', bg: 'bg-purple-500', light: 'bg-purple-100' },
                { id: 'orange', bg: 'bg-orange-500', light: 'bg-orange-100' },
                { id: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100' },
                { id: 'teal', bg: 'bg-teal-500', light: 'bg-teal-100' }
            ];

            const getColorClasses = (colorId) => colors.find(c => c.id === colorId) || colors[0];

            const filteredWorkstreams = workstreams.filter(w => {
                if (filter === 'personal') return w.visibility === 'personal';
                if (filter === 'shared') return w.visibility === 'shared';
                return true;
            });

            const handleCreate = async () => {
                if (!newTitle.trim()) return;
                const result = await onCreateWorkstream({
                    title: newTitle.trim(),
                    description: newDescription.trim(),
                    owner: currentUser,
                    visibility: newVisibility,
                    color: newColor
                });
                if (result) {
                    setNewTitle('');
                    setNewDescription('');
                    setNewVisibility('personal');
                    setNewColor('blue');
                    setShowNewForm(false);
                }
            };

            return (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Workstreams</h2>
                                <p className="text-ocean-100 text-sm mt-1">Manage ongoing work and backlogs</p>
                            </div>
                            <button
                                onClick={() => setShowNewForm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                            >
                                <Icon name="plus" className="w-5 h-5" />
                                <span>New Workstream</span>
                            </button>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-2">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'personal', label: 'Personal' },
                            { id: 'shared', label: 'Shared' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={cx(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition",
                                    filter === f.id
                                        ? "bg-ocean-500 text-white"
                                        : "bg-white text-graystone-600 hover:bg-ocean-50 border border-graystone-200"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* New workstream form */}
                    {showNewForm && (
                        <div className="bg-white rounded-xl border border-ocean-200 p-6 shadow-sm space-y-4">
                            <h3 className="text-lg font-bold text-ocean-900">Create New Workstream</h3>

                            <div>
                                <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g., Website Requests"
                                    className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-graystone-700 mb-1">Description</label>
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="What is this workstream for?"
                                    rows={2}
                                    className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-graystone-700 mb-1">Color</label>
                                <div className="flex gap-2">
                                    {colors.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setNewColor(c.id)}
                                            className={cx(
                                                "w-8 h-8 rounded-full transition",
                                                c.bg,
                                                newColor === c.id ? "ring-2 ring-offset-2 ring-ocean-500" : ""
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-graystone-700 mb-1">Visibility</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            checked={newVisibility === 'personal'}
                                            onChange={() => setNewVisibility('personal')}
                                            className="text-ocean-500 focus:ring-ocean-500"
                                        />
                                        <span className="text-sm">Personal</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            checked={newVisibility === 'shared'}
                                            onChange={() => setNewVisibility('shared')}
                                            className="text-ocean-500 focus:ring-ocean-500"
                                        />
                                        <span className="text-sm">Shared with team</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newTitle.trim()}
                                    className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Workstream
                                </button>
                                <button
                                    onClick={() => setShowNewForm(false)}
                                    className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Workstream cards */}
                    {filteredWorkstreams.length === 0 ? (
                        <div className="bg-white rounded-xl border border-graystone-200 p-12 text-center">
                            <Icon name="layers" className="w-12 h-12 text-graystone-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-graystone-600 mb-2">No workstreams yet</h3>
                            <p className="text-graystone-400 mb-4">Create your first workstream to start tracking ongoing work</p>
                            <button
                                onClick={() => setShowNewForm(true)}
                                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition"
                            >
                                Create Workstream
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredWorkstreams.map(ws => {
                                const colorClasses = getColorClasses(ws.color);
                                return (
                                    <button
                                        key={ws.id}
                                        onClick={() => onOpenWorkstream(ws.id)}
                                        className="bg-white rounded-xl border border-graystone-200 p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cx("w-3 h-3 rounded-full mt-1.5", colorClasses.bg)} />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-ocean-900 truncate">{ws.title}</h3>
                                                {ws.description && (
                                                    <p className="text-sm text-graystone-500 mt-1 line-clamp-2">{ws.description}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-3 text-xs text-graystone-400">
                                                    <span className={cx(
                                                        "px-2 py-0.5 rounded-full",
                                                        ws.visibility === 'shared' ? "bg-ocean-100 text-ocean-700" : "bg-graystone-100 text-graystone-600"
                                                    )}>
                                                        {ws.visibility === 'shared' ? 'Shared' : 'Personal'}
                                                    </span>
                                                    <span>Owner: {ws.owner}</span>
                                                </div>
                                            </div>
                                            <Icon name="chevron-right" className="w-5 h-5 text-graystone-300 group-hover:text-ocean-500 transition" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add WorkstreamList component"
```

---

## Task 6: Create WorkstreamView Component (Two-Lane Layout)

**Files:**
- Modify: `index.html` (add after WorkstreamList component)

**Step 1: Add WorkstreamView component**

```javascript
        function WorkstreamView({
            workstream,
            tasks,
            currentUser,
            userEmail,
            onBack,
            onLoadTasks,
            onCreateTask,
            onUpdateTask,
            onDeleteTask,
            onReorderTasks,
            onUpdateWorkstream,
            onDeleteWorkstream,
            onOpenTask
        }) {
            const [showSettings, setShowSettings] = useState(false);
            const [showNewTaskForm, setShowNewTaskForm] = useState(null); // 'deadline' or 'backlog'
            const [newTaskTitle, setNewTaskTitle] = useState('');
            const [newTaskDeadline, setNewTaskDeadline] = useState('');
            const [newTaskPriority, setNewTaskPriority] = useState('medium');
            const [draggedTask, setDraggedTask] = useState(null);

            // Load tasks when component mounts
            useEffect(() => {
                if (workstream?.id) {
                    onLoadTasks(workstream.id);
                }
            }, [workstream?.id]);

            const colors = [
                { id: 'blue', bg: 'bg-blue-500' },
                { id: 'green', bg: 'bg-green-500' },
                { id: 'purple', bg: 'bg-purple-500' },
                { id: 'orange', bg: 'bg-orange-500' },
                { id: 'pink', bg: 'bg-pink-500' },
                { id: 'teal', bg: 'bg-teal-500' }
            ];

            // Split tasks into time-sensitive and backlog
            const timeSensitiveTasks = (tasks || [])
                .filter(t => t.deadline && t.status !== 'done')
                .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

            const backlogTasks = (tasks || [])
                .filter(t => !t.deadline && t.status !== 'done');

            const highPriority = backlogTasks.filter(t => t.priority === 'high').sort((a, b) => a.sort_order - b.sort_order);
            const mediumPriority = backlogTasks.filter(t => t.priority === 'medium').sort((a, b) => a.sort_order - b.sort_order);
            const lowPriority = backlogTasks.filter(t => t.priority === 'low').sort((a, b) => a.sort_order - b.sort_order);

            const handleCreateTask = async () => {
                if (!newTaskTitle.trim()) return;

                const task = {
                    workstreamId: workstream.id,
                    title: newTaskTitle.trim(),
                    priority: showNewTaskForm === 'deadline' ? 'medium' : newTaskPriority,
                    deadline: showNewTaskForm === 'deadline' ? newTaskDeadline : null,
                    assignee: currentUser,
                    assigneeEmail: userEmail,
                    sortOrder: showNewTaskForm === 'backlog'
                        ? (newTaskPriority === 'high' ? highPriority.length : newTaskPriority === 'medium' ? mediumPriority.length : lowPriority.length)
                        : 0
                };

                const result = await onCreateTask(task);
                if (result) {
                    setNewTaskTitle('');
                    setNewTaskDeadline('');
                    setNewTaskPriority('medium');
                    setShowNewTaskForm(null);
                }
            };

            const handleDragStart = (task) => {
                setDraggedTask(task);
            };

            const handleDragOver = (e) => {
                e.preventDefault();
            };

            const handleDropOnPriority = async (targetPriority) => {
                if (!draggedTask) return;

                // Get target list
                const targetList = targetPriority === 'high' ? highPriority
                    : targetPriority === 'medium' ? mediumPriority
                    : lowPriority;

                // Calculate new sort order (add to end)
                const newSortOrder = targetList.length;

                // Update task
                await onUpdateTask(draggedTask.id, workstream.id, {
                    priority: targetPriority,
                    sortOrder: newSortOrder,
                    deadline: null // Move to backlog removes deadline
                });

                setDraggedTask(null);
            };

            const handleDropOnTimeSensitive = async () => {
                if (!draggedTask) return;
                // If dropping on time-sensitive, prompt for deadline
                const deadline = prompt('Enter deadline (YYYY-MM-DD):');
                if (deadline) {
                    await onUpdateTask(draggedTask.id, workstream.id, {
                        deadline: deadline
                    });
                }
                setDraggedTask(null);
            };

            const TaskCard = ({ task, showDeadline = false }) => (
                <div
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onClick={() => onOpenTask(task.id)}
                    className="bg-white rounded-lg border border-graystone-200 p-3 cursor-pointer hover:shadow-md hover:border-ocean-300 transition group"
                >
                    <div className="flex items-start gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTask(task.id, workstream.id, { status: task.status === 'done' ? 'open' : 'done' });
                            }}
                            className={cx(
                                "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition",
                                task.status === 'done'
                                    ? "bg-ocean-500 border-ocean-500 text-white"
                                    : "border-graystone-300 hover:border-ocean-500"
                            )}
                        >
                            {task.status === 'done' && <Icon name="check" className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className={cx(
                                "text-sm font-medium",
                                task.status === 'done' ? "text-graystone-400 line-through" : "text-graystone-900"
                            )}>
                                {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-graystone-400">
                                {showDeadline && task.deadline && (
                                    <span className={cx(
                                        "flex items-center gap-1",
                                        new Date(task.deadline) < new Date() ? "text-red-500" : ""
                                    )}>
                                        <Icon name="calendar" className="w-3 h-3" />
                                        {new Date(task.deadline).toLocaleDateString()}
                                    </span>
                                )}
                                {task.assignee && (
                                    <span className="flex items-center gap-1">
                                        <Icon name="user" className="w-3 h-3" />
                                        {task.assignee}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Icon name="grip-vertical" className="w-4 h-4 text-graystone-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                    </div>
                </div>
            );

            const PrioritySection = ({ priority, tasks: priorityTasks, label }) => (
                <div
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnPriority(priority)}
                    className={cx(
                        "border rounded-lg p-3 transition",
                        draggedTask ? "border-dashed border-ocean-400 bg-ocean-50" : "border-graystone-200"
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-graystone-500 uppercase">{label} ({priorityTasks.length})</h4>
                    </div>
                    <div className="space-y-2">
                        {priorityTasks.map(task => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                        {priorityTasks.length === 0 && (
                            <p className="text-xs text-graystone-400 text-center py-2">Drop tasks here</p>
                        )}
                    </div>
                </div>
            );

            if (!workstream) return null;

            return (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-white/20 rounded-lg transition"
                            >
                                <Icon name="arrow-left" className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold">{workstream.title}</h2>
                                {workstream.description && (
                                    <p className="text-ocean-100 text-sm mt-1">{workstream.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 hover:bg-white/20 rounded-lg transition"
                            >
                                <Icon name="settings" className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Time-sensitive column */}
                        <div
                            onDragOver={handleDragOver}
                            onDrop={handleDropOnTimeSensitive}
                            className="bg-white rounded-xl border border-graystone-200 p-4"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-ocean-900">
                                    Time-Sensitive ({timeSensitiveTasks.length})
                                </h3>
                            </div>

                            <div className="space-y-2 mb-4">
                                {timeSensitiveTasks.map(task => (
                                    <TaskCard key={task.id} task={task} showDeadline />
                                ))}
                                {timeSensitiveTasks.length === 0 && !showNewTaskForm && (
                                    <p className="text-sm text-graystone-400 text-center py-4">No time-sensitive tasks</p>
                                )}
                            </div>

                            {showNewTaskForm === 'deadline' ? (
                                <div className="border border-ocean-200 rounded-lg p-3 space-y-2">
                                    <input
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="Task title..."
                                        className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                        autoFocus
                                    />
                                    <input
                                        type="date"
                                        value={newTaskDeadline}
                                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateTask}
                                            disabled={!newTaskTitle.trim() || !newTaskDeadline}
                                            className="px-3 py-1.5 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => { setShowNewTaskForm(null); setNewTaskTitle(''); setNewTaskDeadline(''); }}
                                            className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowNewTaskForm('deadline')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-ocean-600 hover:bg-ocean-50 rounded-lg transition"
                                >
                                    <Icon name="plus" className="w-4 h-4" />
                                    Add time-sensitive task
                                </button>
                            )}
                        </div>

                        {/* Backlog column */}
                        <div className="bg-white rounded-xl border border-graystone-200 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-ocean-900">Backlog</h3>
                            </div>

                            <div className="space-y-4 mb-4">
                                <PrioritySection priority="high" tasks={highPriority} label="High" />
                                <PrioritySection priority="medium" tasks={mediumPriority} label="Medium" />
                                <PrioritySection priority="low" tasks={lowPriority} label="Low" />
                            </div>

                            {showNewTaskForm === 'backlog' ? (
                                <div className="border border-ocean-200 rounded-lg p-3 space-y-2">
                                    <input
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="Task title..."
                                        className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                        autoFocus
                                    />
                                    <select
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    >
                                        <option value="high">High Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="low">Low Priority</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateTask}
                                            disabled={!newTaskTitle.trim()}
                                            className="px-3 py-1.5 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => { setShowNewTaskForm(null); setNewTaskTitle(''); }}
                                            className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowNewTaskForm('backlog')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-ocean-600 hover:bg-ocean-50 rounded-lg transition"
                                >
                                    <Icon name="plus" className="w-4 h-4" />
                                    Add to backlog
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Settings Modal */}
                    {showSettings && (
                        <WorkstreamSettings
                            workstream={workstream}
                            onClose={() => setShowSettings(false)}
                            onUpdate={onUpdateWorkstream}
                            onDelete={onDeleteWorkstream}
                        />
                    )}
                </div>
            );
        }
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add WorkstreamView component with two-lane layout"
```

---

## Task 7: Create WorkstreamSettings Component

**Files:**
- Modify: `index.html` (add after WorkstreamView component)

**Step 1: Add WorkstreamSettings component**

```javascript
        function WorkstreamSettings({ workstream, onClose, onUpdate, onDelete }) {
            const [title, setTitle] = useState(workstream.title);
            const [description, setDescription] = useState(workstream.description || '');
            const [visibility, setVisibility] = useState(workstream.visibility);
            const [color, setColor] = useState(workstream.color || 'blue');
            const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

            const colors = [
                { id: 'blue', bg: 'bg-blue-500' },
                { id: 'green', bg: 'bg-green-500' },
                { id: 'purple', bg: 'bg-purple-500' },
                { id: 'orange', bg: 'bg-orange-500' },
                { id: 'pink', bg: 'bg-pink-500' },
                { id: 'teal', bg: 'bg-teal-500' }
            ];

            const handleSave = async () => {
                await onUpdate(workstream.id, {
                    title: title.trim(),
                    description: description.trim(),
                    visibility,
                    color
                });
                onClose();
            };

            const handleDelete = async () => {
                await onDelete(workstream.id);
                onClose();
            };

            return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-ocean-900">Workstream Settings</h2>
                            <button onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-lg transition">
                                <Icon name="x" className="w-5 h-5 text-graystone-500" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-graystone-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-graystone-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-graystone-700 mb-1">Color</label>
                            <div className="flex gap-2">
                                {colors.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setColor(c.id)}
                                        className={cx(
                                            "w-8 h-8 rounded-full transition",
                                            c.bg,
                                            color === c.id ? "ring-2 ring-offset-2 ring-ocean-500" : ""
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-graystone-700 mb-1">Visibility</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={visibility === 'personal'}
                                        onChange={() => setVisibility('personal')}
                                        className="text-ocean-500 focus:ring-ocean-500"
                                    />
                                    <span className="text-sm">Personal</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={visibility === 'shared'}
                                        onChange={() => setVisibility('shared')}
                                        className="text-ocean-500 focus:ring-ocean-500"
                                    />
                                    <span className="text-sm">Shared</span>
                                </label>
                            </div>
                        </div>

                        <div className="border-t border-graystone-200 pt-4">
                            <div className="text-xs text-graystone-400 mb-2">
                                Owner: {workstream.owner}<br />
                                Created: {new Date(workstream.created_at).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            {showDeleteConfirm ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-red-600">Delete workstream?</span>
                                    <button
                                        onClick={handleDelete}
                                        className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                                    >
                                        Yes, delete
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-sm text-red-500 hover:text-red-600 transition"
                                >
                                    Delete Workstream
                                </button>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={!title.trim()}
                                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add WorkstreamSettings component"
```

---

## Task 8: Create WorkstreamTaskDetail Component

**Files:**
- Modify: `index.html` (add after WorkstreamSettings component)

**Step 1: Add WorkstreamTaskDetail component**

```javascript
        function WorkstreamTaskDetail({
            task,
            workstream,
            currentUser,
            userEmail,
            entries,
            onBack,
            onUpdate,
            onDelete
        }) {
            const [title, setTitle] = useState(task.title);
            const [description, setDescription] = useState(task.description || '');
            const [priority, setPriority] = useState(task.priority);
            const [status, setStatus] = useState(task.status);
            const [deadline, setDeadline] = useState(task.deadline || '');
            const [assignee, setAssignee] = useState(task.assignee || '');
            const [requester, setRequester] = useState(task.requester || '');
            const [tags, setTags] = useState(task.tags || []);
            const [newTag, setNewTag] = useState('');
            const [comments, setComments] = useState(task.comments || []);
            const [newComment, setNewComment] = useState('');
            const [editingDescription, setEditingDescription] = useState(false);
            const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

            const handleSave = (updates) => {
                onUpdate(task.id, workstream.id, updates);
            };

            const handleAddTag = () => {
                if (newTag.trim() && !tags.includes(newTag.trim())) {
                    const newTags = [...tags, newTag.trim()];
                    setTags(newTags);
                    handleSave({ tags: newTags });
                    setNewTag('');
                }
            };

            const handleRemoveTag = (tag) => {
                const newTags = tags.filter(t => t !== tag);
                setTags(newTags);
                handleSave({ tags: newTags });
            };

            const handleAddComment = () => {
                if (!newComment.trim()) return;
                const comment = {
                    id: crypto.randomUUID(),
                    author: currentUser,
                    text: newComment.trim(),
                    timestamp: new Date().toISOString()
                };
                const newComments = [...comments, comment];
                setComments(newComments);
                handleSave({ comments: newComments });
                setNewComment('');
            };

            const handleDelete = () => {
                onDelete(task.id, workstream.id);
                onBack();
            };

            return (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-white/20 rounded-lg transition"
                            >
                                <Icon name="arrow-left" className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <p className="text-ocean-100 text-sm">{workstream.title}</p>
                                <h2 className="text-2xl font-bold">{task.title}</h2>
                            </div>
                            <button
                                onClick={() => handleSave({ status: status === 'done' ? 'open' : 'done' })}
                                className={cx(
                                    "px-4 py-2 rounded-lg transition flex items-center gap-2",
                                    status === 'done'
                                        ? "bg-green-500 hover:bg-green-600"
                                        : "bg-white/20 hover:bg-white/30"
                                )}
                            >
                                <Icon name={status === 'done' ? "check-circle" : "circle"} className="w-5 h-5" />
                                {status === 'done' ? 'Completed' : 'Mark Done'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Description */}
                            <div className="bg-white rounded-xl border border-graystone-200 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-semibold text-graystone-500 uppercase">Description</h3>
                                    {!editingDescription && (
                                        <button
                                            onClick={() => setEditingDescription(true)}
                                            className="text-sm text-ocean-500 hover:text-ocean-600"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {editingDescription ? (
                                    <div className="space-y-2">
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                            placeholder="Add a description..."
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    handleSave({ description });
                                                    setEditingDescription(false);
                                                }}
                                                className="px-3 py-1.5 bg-ocean-500 text-white text-sm rounded-lg hover:bg-ocean-600 transition"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDescription(task.description || '');
                                                    setEditingDescription(false);
                                                }}
                                                className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-graystone-700 whitespace-pre-wrap">
                                        {description || <span className="text-graystone-400 italic">No description</span>}
                                    </p>
                                )}
                            </div>

                            {/* Comments */}
                            <div className="bg-white rounded-xl border border-graystone-200 p-4">
                                <h3 className="text-sm font-semibold text-graystone-500 uppercase mb-4">Comments</h3>
                                <div className="space-y-4 mb-4">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-ocean-100 flex items-center justify-center text-sm font-bold text-ocean-600 flex-shrink-0">
                                                {comment.author?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-graystone-900">{comment.author}</span>
                                                    <span className="text-xs text-graystone-400">
                                                        {new Date(comment.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-graystone-700">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {comments.length === 0 && (
                                        <p className="text-graystone-400 text-sm">No comments yet</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                        placeholder="Write a comment..."
                                        className="flex-1 px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim()}
                                        className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition disabled:opacity-50"
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4">
                            {/* Details */}
                            <div className="bg-white rounded-xl border border-graystone-200 p-4 space-y-4">
                                <h3 className="text-sm font-semibold text-graystone-500 uppercase">Details</h3>

                                <div>
                                    <label className="text-xs text-graystone-500 block mb-1">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={(e) => {
                                            setPriority(e.target.value);
                                            handleSave({ priority: e.target.value });
                                        }}
                                        className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    >
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-graystone-500 block mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => {
                                            setStatus(e.target.value);
                                            handleSave({ status: e.target.value });
                                        }}
                                        className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-graystone-500 block mb-1">Deadline</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="date"
                                            value={deadline}
                                            onChange={(e) => {
                                                setDeadline(e.target.value);
                                                handleSave({ deadline: e.target.value || null });
                                            }}
                                            className="flex-1 px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                        />
                                        {deadline && (
                                            <button
                                                onClick={() => {
                                                    setDeadline('');
                                                    handleSave({ deadline: null });
                                                }}
                                                className="px-2 text-graystone-400 hover:text-graystone-600"
                                            >
                                                <Icon name="x" className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-graystone-500 block mb-1">Assignee</label>
                                    <select
                                        value={assignee}
                                        onChange={(e) => {
                                            setAssignee(e.target.value);
                                            const email = USERS_WITH_EMAILS?.find(u => u.name === e.target.value)?.email || '';
                                            handleSave({ assignee: e.target.value, assigneeEmail: email });
                                        }}
                                        className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    >
                                        <option value="">Unassigned</option>
                                        {USERS.map(user => (
                                            <option key={user} value={user}>{user}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-graystone-500 block mb-1">Requester</label>
                                    <input
                                        type="text"
                                        value={requester}
                                        onChange={(e) => setRequester(e.target.value)}
                                        onBlur={() => handleSave({ requester })}
                                        placeholder="Who requested this?"
                                        className="w-full px-3 py-2 border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-graystone-500 block mb-1">Added</label>
                                    <p className="text-sm text-graystone-700">
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="bg-white rounded-xl border border-graystone-200 p-4">
                                <h3 className="text-sm font-semibold text-graystone-500 uppercase mb-2">Tags</h3>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-ocean-100 text-ocean-700 rounded-full text-xs"
                                        >
                                            {tag}
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="hover:text-ocean-900"
                                            >
                                                <Icon name="x" className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                        placeholder="Add tag..."
                                        className="flex-1 px-3 py-1.5 text-sm border border-graystone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                                    />
                                    <button
                                        onClick={handleAddTag}
                                        className="px-3 py-1.5 text-sm text-ocean-500 hover:bg-ocean-50 rounded-lg transition"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Delete */}
                            <div className="bg-white rounded-xl border border-red-200 p-4">
                                {showDeleteConfirm ? (
                                    <div className="space-y-2">
                                        <p className="text-sm text-red-600">Are you sure you want to delete this task?</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleDelete}
                                                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="px-3 py-1.5 text-graystone-600 text-sm hover:bg-graystone-100 rounded-lg transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-sm text-red-500 hover:text-red-600 transition"
                                    >
                                        Delete Task
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add WorkstreamTaskDetail component"
```

---

## Task 9: Add Workstreams to renderContent Switch

**Files:**
- Modify: `index.html` (renderContent function, around line 19522)

**Step 1: Add workstreams case to renderContent switch**

Find the `renderContent` function and add the workstreams case after the jobs case:

```javascript
                    case 'workstreams':
                        if (currentWorkstreamTaskId && currentWorkstreamId) {
                            const ws = workstreams.find(w => w.id === currentWorkstreamId);
                            const tasks = workstreamTasks[currentWorkstreamId] || [];
                            const task = tasks.find(t => t.id === currentWorkstreamTaskId);
                            if (ws && task) {
                                return (
                                    <WorkstreamTaskDetail
                                        task={task}
                                        workstream={ws}
                                        currentUser={currentUser}
                                        userEmail={userEmail}
                                        entries={entries}
                                        onBack={() => setCurrentWorkstreamTaskId(null)}
                                        onUpdate={handleUpdateWorkstreamTask}
                                        onDelete={handleDeleteWorkstreamTask}
                                    />
                                );
                            }
                        }
                        if (currentWorkstreamId) {
                            const ws = workstreams.find(w => w.id === currentWorkstreamId);
                            if (ws) {
                                return (
                                    <WorkstreamView
                                        workstream={ws}
                                        tasks={workstreamTasks[currentWorkstreamId] || []}
                                        currentUser={currentUser}
                                        userEmail={userEmail}
                                        onBack={() => setCurrentWorkstreamId(null)}
                                        onLoadTasks={handleLoadWorkstreamTasks}
                                        onCreateTask={handleCreateWorkstreamTask}
                                        onUpdateTask={handleUpdateWorkstreamTask}
                                        onDeleteTask={handleDeleteWorkstreamTask}
                                        onReorderTasks={handleReorderTasks}
                                        onUpdateWorkstream={handleUpdateWorkstream}
                                        onDeleteWorkstream={handleDeleteWorkstream}
                                        onOpenTask={(taskId) => setCurrentWorkstreamTaskId(taskId)}
                                    />
                                );
                            }
                        }
                        return (
                            <WorkstreamList
                                workstreams={workstreams}
                                currentUser={currentUser}
                                userEmail={userEmail}
                                onOpenWorkstream={(id) => setCurrentWorkstreamId(id)}
                                onCreateWorkstream={handleCreateWorkstream}
                            />
                        );
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add workstreams view routing in renderContent"
```

---

## Task 10: Add Workstream Tasks to Dashboard

**Files:**
- Modify: `index.html` (Dashboard component, around line 5674)

**Step 1: Update Dashboard to accept workstream tasks**

Update the Dashboard function signature to include workstream tasks:

```javascript
        function Dashboard({ entries, currentUser, onOpenEntry, onOpenPdfExport, onNavigate, todos = [], onToggleTodo, onAddTodo, onUpdateTodo, onDeleteTodo, onUpdateEntry, onEditSubtask, workstreamTasks = [], onOpenWorkstreamTask }) {
```

**Step 2: Add workstream tasks to Today's Tasks section**

Find the Today's Tasks section in Dashboard and update the `todaysTasks` calculation to include workstream tasks:

```javascript
            // Workstream tasks due today
            const workstreamTasksToday = workstreamTasks.filter(t => {
                if (t.status === 'done') return false;
                return t.deadline === today;
            });
```

Then update the Today's Tasks rendering to include workstream tasks:

```javascript
                                        {/* Workstream tasks */}
                                        {workstreamTasksToday.map(task => (
                                            <div
                                                key={`ws-${task.id}`}
                                                onClick={() => onOpenWorkstreamTask && onOpenWorkstreamTask(task)}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-graystone-50 cursor-pointer transition group"
                                            >
                                                <div className="w-5 h-5 rounded border-2 border-graystone-300 flex items-center justify-center flex-shrink-0">
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-graystone-900 truncate">{task.title}</p>
                                                    <p className="text-xs text-graystone-500">{task.workstreams?.title || 'Workstream'}</p>
                                                </div>
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">Workstream</span>
                                            </div>
                                        ))}
```

**Step 3: Update Dashboard call in renderContent to pass workstream tasks**

Find where Dashboard is rendered and add the workstream tasks props:

```javascript
                        return <Dashboard
                            entries={entries}
                            currentUser={currentUser}
                            onOpenEntry={handleOpenEntry}
                            onOpenPdfExport={handleOpenPdfExport}
                            onNavigate={handleNavigate}
                            todos={todos}
                            onToggleTodo={handleToggleTodo}
                            onAddTodo={handleAddTodo}
                            onUpdateTodo={handleUpdateTodo}
                            onDeleteTodo={handleDeleteTodo}
                            onUpdateEntry={handleUpdateEntry}
                            onEditSubtask={handleEditSubtask}
                            workstreamTasks={myWorkstreamTasks}
                            onOpenWorkstreamTask={(task) => {
                                setCurrentWorkstreamId(task.workstream_id);
                                setCurrentWorkstreamTaskId(task.id);
                                setCurrentView('workstreams');
                            }}
                        />;
```

**Step 4: Add state and effect to load user's workstream tasks**

```javascript
            const [myWorkstreamTasks, setMyWorkstreamTasks] = useState([]);

            useEffect(() => {
                const loadMyWorkstreamTasks = async () => {
                    const tasks = await SUPABASE_API.fetchMyWorkstreamTasks(userEmail);
                    setMyWorkstreamTasks(tasks);
                };
                if (userEmail) {
                    loadMyWorkstreamTasks();
                }
            }, [userEmail]);
```

**Step 5: Commit**

```bash
git add index.html
git commit -m "feat: add workstream tasks to Dashboard Today's Tasks"
```

---

## Task 11: Add Workstream Tasks Stat Card to Dashboard

**Files:**
- Modify: `index.html` (Dashboard component stat cards section)

**Step 1: Add fourth stat card for workstream tasks**

Find the stat cards grid in Dashboard (the section with Projects, Subtasks, Jobs cards) and add a Workstream Tasks card:

```javascript
                        {/* Workstream Tasks card */}
                        <button
                            type="button"
                            onClick={() => openTaskList('workstream-tasks')}
                            className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group"
                        >
                            <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">Workstream Tasks</div>
                            <div className="relative inline-flex items-center justify-center">
                                <div
                                    className="absolute rounded-full transition-all duration-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                                    style={{ backgroundColor: '#0CFFFF', width: '43px', height: '43px' }}
                                ></div>
                                <div className="text-3xl font-bold text-ocean-900 relative z-10">{workstreamTasks.filter(t => t.status !== 'done').length}</div>
                            </div>
                            <div className="text-xs text-graystone-500 mt-1">Open tasks assigned to you</div>
                        </button>
```

**Step 2: Add workstream-tasks case to openTaskList**

Find the `openTaskList` function in Dashboard and add handling for workstream-tasks:

```javascript
            const openTaskList = (type) => {
                if (type === 'projects') {
                    setTaskListType('projects');
                    setTaskListTitle('Your Projects');
                    setTaskListItems(myProjects);
                } else if (type === 'jobs') {
                    setTaskListType('jobs');
                    setTaskListTitle('Your Jobs');
                    setTaskListItems(myJobs);
                } else if (type === 'subtasks') {
                    setTaskListType('subtasks');
                    setTaskListTitle('Your Subtasks');
                    setTaskListItems(mySubtasks.filter(s => !s.completed));
                } else if (type === 'workstream-tasks') {
                    setTaskListType('workstream-tasks');
                    setTaskListTitle('Your Workstream Tasks');
                    setTaskListItems(workstreamTasks.filter(t => t.status !== 'done'));
                }
                setShowTaskList(true);
            };
```

**Step 3: Add rendering for workstream-tasks in the modal**

In the task list modal, add a case for rendering workstream tasks.

**Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Workstream Tasks stat card to Dashboard"
```

---

## Task 12: Final Testing and Verification

**Step 1: Run the migration on Supabase**

Apply the migration to your Supabase instance.

**Step 2: Test the feature**

1. Navigate to Workstreams in sidebar
2. Create a new workstream (personal and shared)
3. Add tasks to both lanes (time-sensitive and backlog)
4. Test drag-and-drop between priority levels
5. Open task detail and edit fields
6. Add comments to a task
7. Verify tasks appear on Dashboard when assigned with deadline for today
8. Test settings (edit, delete workstream)

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```

**Step 4: Push to GitHub**

```bash
git push origin main
```

---

## Summary

This plan implements the full Workstreams feature in 12 tasks:

1. **Database migration** - Tables and RLS policies
2. **API methods** - CRUD operations for workstreams and tasks
3. **App state** - State management and handlers
4. **Navigation** - Sidebar menu item
5. **WorkstreamList** - List view with create form
6. **WorkstreamView** - Two-lane task layout with drag-and-drop
7. **WorkstreamSettings** - Edit/delete workstream modal
8. **WorkstreamTaskDetail** - Full task detail panel
9. **View routing** - renderContent switch case
10. **Dashboard integration** - Today's Tasks section
11. **Stat card** - Workstream Tasks card
12. **Testing** - End-to-end verification
