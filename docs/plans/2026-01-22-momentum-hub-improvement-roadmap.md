# Momentum Hub Improvement Roadmap

**Date:** 2026-01-22
**Scope:** Comprehensive improvement plan covering UX, Performance, Features, and Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan phase-by-phase.

---

## Executive Summary

**Total Improvements Identified:** 47 specific items across 6 categories

| Category | Count | Impact |
|----------|-------|--------|
| Performance | 8 | Faster rendering, better scalability |
| Mobile/Responsive | 7 | Usable on phones/tablets |
| Accessibility | 10 | WCAG compliance, inclusive design |
| New Features | 5 | Complete missing functionality |
| Code Quality | 12 | Maintainability, fewer bugs |
| Polish | 5 | Professional finish |

**Phases:**
1. **Foundation** - Error handling, critical fixes, stability (~5 hours)
2. **Performance** - Memoization, virtualization, optimization (~2 days)
3. **Mobile & Accessibility** - Responsive design, ARIA, keyboard nav (~3 days)
4. **Features** - Notifications, recurring tasks, reporting (~2-3 weeks)
5. **Polish** - Dark mode, PWA, documentation (~2 weeks)

---

## Phase 1: Foundation

**Goal:** Stability and bug-free base before adding features

**Estimated effort:** 3-5 hours
**Dependencies:** None

### Task 1.1: Add Error Boundaries

**Files:**
- Create: `src/components/ui/ErrorBoundary.jsx`
- Modify: `src/App.jsx`

**Step 1: Create ErrorBoundary component**

```jsx
import React from 'react';
import { Icon } from './index';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Icon name="alert-triangle" className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-ocean-900 mb-2">Something went wrong</h2>
          <p className="text-graystone-600 mb-4">This section encountered an error.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Step 2: Export from ui/index.js**

Add to exports: `export { default as ErrorBoundary } from './ErrorBoundary';`

**Step 3: Wrap main views in App.jsx**

Wrap Dashboard, ItemDashboard, TableView, KanbanBoard, and other main views with `<ErrorBoundary>`.

**Verification:** Intentionally throw error in a component, verify it's caught gracefully.

---

### Task 1.2: Implement Delete Workstream Task

**Files:**
- Modify: `src/App.jsx:1678`

**Step 1: Add delete handler**

```javascript
const handleDeleteWorkstreamTask = async (taskId) => {
  if (!window.confirm('Are you sure you want to delete this task?')) return;

  const result = await SUPABASE_API.deleteWorkstreamTask(taskId);
  if (result) {
    setWorkstreamTasks(prev => prev.filter(t => t.id !== taskId));
    // Close detail view if open
    if (selectedWorkstreamTask?.id === taskId) {
      setSelectedWorkstreamTask(null);
    }
  }
};
```

**Step 2: Add API method if missing**

In SUPABASE_API object, add:
```javascript
deleteWorkstreamTask: async (taskId) => {
  if (!supabase) return false;
  const { error } = await supabase
    .from('workstream_tasks')
    .delete()
    .eq('id', taskId);
  if (error) {
    Logger.error({ error, taskId }, 'Failed to delete workstream task');
    return false;
  }
  return true;
},
```

**Step 3: Pass handler to WorkstreamTaskDetail component**

**Verification:** Delete a workstream task, verify it's removed from list.

---

### Task 1.3: Standardize Logger Usage

**Files:**
- Modify: `src/contexts/AppContext.jsx:90-109`

**Step 1: Replace console.log calls**

Replace all instances of:
- `console.log('...')` with `Logger.debug('...')`
- `console.error('...')` with `Logger.error('...')`

**Specific lines in AppContext.jsx:**
- Line 90: `console.log` → `Logger.debug`
- Line 92: `console.log` → `Logger.debug`
- Line 96: `console.log` → `Logger.debug`
- Line 103: `console.log` → `Logger.debug`
- Line 105: `console.log` → `Logger.debug`
- Line 109: `console.log` → `Logger.debug`

**Step 2: Check WhiteboardThumbnail.jsx:18**

Replace `console.error()` with `Logger.error()`

**Verification:** `git grep "console\." src/` returns no matches (except intentional debug).

---

### Task 1.4: Standardize API Error Returns

**Files:**
- Modify: `src/App.jsx:220-304` (SUPABASE_API methods)

**Step 1: Audit return values**

Ensure all methods follow pattern:
- Success: Return data or `true`
- Failure: Return `null` (not `false`)

**Methods to check:**
- `saveItem` - returns null on error (good)
- `deleteItem` - returns false on error (change to null)
- `updateItem` - verify consistent
- All other CRUD methods

**Verification:** Grep for `return false` in API methods, update to `return null`.

---

### Task 1.5: Add Input Validation

**Files:**
- Modify: `src/components/features/dashboard/Dashboard.jsx:57-65`
- Modify: `src/components/features/workstreams/WorkstreamList.jsx:36`

**Step 1: Add length validation to handleAddTask**

```javascript
const handleAddTask = () => {
  const trimmed = newTaskText.trim();
  if (!trimmed) return;
  if (trimmed.length > 500) {
    // Optionally show error message
    return;
  }
  if (onAddTodo) {
    onAddTodo({
      text: trimmed,
      date: today,
      completed: false,
    });
    setNewTaskText('');
  }
};
```

**Step 2: Add validation to WorkstreamList handleCreate**

Add description length check (e.g., 2000 char max).

**Verification:** Try submitting very long text, verify it's rejected.

---

## Phase 2: Performance

**Goal:** Faster rendering, better scalability for large datasets

**Estimated effort:** 1-2 days
**Dependencies:** Phase 1 complete

### Task 2.1: Memoize Handler Callbacks

**Files:**
- Modify: `src/App.jsx`

**Step 1: Wrap navigation handlers in useCallback**

```javascript
const handleNavigate = useCallback((view) => {
  setCurrentView(view);
  setSelectedEntry(null);
}, []);

const handleOpenEntry = useCallback((entryId) => {
  const entry = entries.find(e => e.id === entryId);
  if (entry) {
    setSelectedEntry(entry);
    setCurrentView('item-dashboard');
  }
}, [entries]);

const handleUpdateEntry = useCallback(async (entryId, updates) => {
  // ... existing logic
}, [/* dependencies */]);
```

**Step 2: Identify and wrap all handlers passed as props**

Look for functions passed to child components and wrap with useCallback.

**Verification:** React DevTools Profiler shows fewer re-renders.

---

### Task 2.2: Memoize Expensive Calculations

**Files:**
- Modify: `src/components/features/whiteboards/WhiteboardThumbnail.jsx:42-71`

**Step 1: Memoize bounds calculation**

```javascript
const bounds = useMemo(() => {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }
  return elements.reduce((acc, el) => ({
    minX: Math.min(acc.minX, el.x),
    minY: Math.min(acc.minY, el.y),
    maxX: Math.max(acc.maxX, el.x + (el.width || 100)),
    maxY: Math.max(acc.maxY, el.y + (el.height || 100)),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}, [elements]);
```

**Step 2: Memoize scale and offset**

```javascript
const { scale, offsetX, offsetY } = useMemo(() => {
  const previewWidth = 280;
  const previewHeight = 180;
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const scaleX = previewWidth / contentWidth;
  const scaleY = previewHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  return {
    scale,
    offsetX: -bounds.minX * scale,
    offsetY: -bounds.minY * scale,
  };
}, [bounds]);
```

**Verification:** Whiteboard list renders faster with many boards.

---

### Task 2.3: Add List Virtualization

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `src/components/features/dashboard/Dashboard.jsx`

**Step 1: Install react-window**

```bash
npm install react-window
```

**Step 2: Virtualize Today's Tasks list**

```jsx
import { FixedSizeList as List } from 'react-window';

// In render, replace map with:
<List
  height={256}
  itemCount={todaysTasks.length}
  itemSize={72}
  width="100%"
>
  {({ index, style }) => {
    const task = todaysTasks[index];
    return (
      <div style={style}>
        {/* existing task item JSX */}
      </div>
    );
  }}
</List>
```

**Step 3: Apply to other long lists**

- Task list modal (Dashboard.jsx:1051-1221)
- Kanban columns with many cards

**Verification:** Create 200+ tasks, verify smooth scrolling.

---

### Task 2.4: Lazy Load Views

**Files:**
- Modify: `src/App.jsx`

**Step 1: Convert heavy components to lazy imports**

```javascript
import React, { Suspense, lazy } from 'react';

// Replace direct imports with lazy
const WhiteboardCanvas = lazy(() => import('./components/features/whiteboards/WhiteboardCanvas'));
const CalendarScreen = lazy(() => import('./components/features/calendar/CalendarScreen'));
const GanttView = lazy(() => import('./components/features/views/GanttView'));
```

**Step 2: Wrap with Suspense**

```jsx
<Suspense fallback={<LoadingSpinner />}>
  {currentView === 'whiteboards' && <WhiteboardCanvas {...props} />}
</Suspense>
```

**Verification:** Network tab shows components load on-demand.

---

## Phase 3: Mobile & Accessibility

**Goal:** Usable on all devices, inclusive for all users

**Estimated effort:** 2-3 days
**Dependencies:** Phase 1 complete

### Task 3.1: Fix Mobile Responsive Issues

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/features/dashboard/Dashboard.jsx`

**Step 1: Fix filter dropdown widths**

Change `w-64` to `w-full md:w-64` on filter dropdowns (App.jsx:1215-1245).

**Step 2: Fix container heights**

Change `max-h-64` to `max-h-[50vh] md:max-h-64` on scrollable containers.

**Step 3: Increase touch targets**

Ensure all clickable elements are minimum 44x44px on mobile:
```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

**Step 4: Add responsive modal padding**

Change modal padding from `p-6` to `p-4 md:p-6`.

**Verification:** Test on iPhone SE (smallest common viewport).

---

### Task 3.2: Add ARIA Labels

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/features/dashboard/Dashboard.jsx`

**Step 1: Label filter buttons**

```jsx
<button aria-label="Filter by team" ...>
<button aria-label="Filter by status" ...>
<button aria-label="Filter by tag" ...>
```

**Step 2: Label icon-only buttons**

```jsx
<button aria-label="Add task" ...>
  <Icon name="plus" />
</button>
```

**Step 3: Add form labels**

```jsx
<label htmlFor="new-task-input" className="sr-only">New task</label>
<input id="new-task-input" ... />
```

**Step 4: Add live regions for loading states**

```jsx
<div aria-live="polite" aria-busy={loading}>
  {loading && <span className="sr-only">Loading...</span>}
</div>
```

**Verification:** Test with VoiceOver (Mac) or NVDA (Windows).

---

### Task 3.3: Implement Keyboard Navigation

**Files:**
- Modify: `src/components/features/views/KanbanBoard.jsx`
- Modify: All modal components

**Step 1: Add keyboard support to Kanban**

```jsx
const handleKeyDown = (e, card, columnIndex) => {
  if (e.key === 'ArrowRight' && columnIndex < columns.length - 1) {
    moveCard(card.id, columns[columnIndex + 1].id);
  }
  if (e.key === 'ArrowLeft' && columnIndex > 0) {
    moveCard(card.id, columns[columnIndex - 1].id);
  }
};
```

**Step 2: Add focus trap to modals**

Install focus-trap-react:
```bash
npm install focus-trap-react
```

```jsx
import FocusTrap from 'focus-trap-react';

<FocusTrap>
  <div className="modal">
    {/* modal content */}
  </div>
</FocusTrap>
```

**Step 3: Return focus on modal close**

```javascript
const triggerRef = useRef(null);

const openModal = (e) => {
  triggerRef.current = e.currentTarget;
  setIsOpen(true);
};

const closeModal = () => {
  setIsOpen(false);
  triggerRef.current?.focus();
};
```

**Step 4: Standardize Escape key handling**

Add to all dropdowns/modals:
```javascript
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, []);
```

**Verification:** Navigate entire app using only keyboard.

---

## Phase 4: Features

**Goal:** Complete missing functionality, add high-value new features

**Estimated effort:** 2-3 weeks
**Dependencies:** Phases 1-3 complete

### Task 4.1: Real-Time Notifications

**Files:**
- Create: `src/hooks/useNotifications.js`
- Modify: `src/App.jsx`
- Modify: `src/components/features/overlays/NotificationsPanel.jsx`

**Step 1: Create notification hook with Supabase Realtime**

```javascript
import { useEffect, useState } from 'react';
import { getSupabase } from '../api/supabase';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return notifications;
}
```

**Step 2: Create notifications on events**

Add trigger function to create notifications when:
- User is @mentioned in a comment
- Task is assigned to user
- Deadline approaching (24h)

**Step 3: Display unread count badge**

```jsx
const unreadCount = notifications.filter(n => !n.read).length;

<button className="relative">
  <Icon name="bell" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</button>
```

**Verification:** Mention a user, see notification appear in real-time.

---

### Task 4.2: Recurring Tasks

**Files:**
- Create: `supabase/migrations/015_add_recurring_tasks.sql`
- Modify: `src/components/features/todos/ToDoList.jsx`
- Create: `supabase/functions/process-recurring-tasks/index.ts`

**Step 1: Add recurrence fields to personal_todos**

```sql
ALTER TABLE personal_todos
ADD COLUMN recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', 'custom'
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN parent_recurring_id UUID REFERENCES personal_todos(id);
```

**Step 2: Create Edge Function for processing**

Scheduled function that runs daily to create new instances of recurring tasks.

**Step 3: Add UI for setting recurrence**

Add dropdown in todo edit form:
- None (default)
- Daily
- Weekly
- Monthly
- Custom (every N days)

**Verification:** Create weekly task, verify it auto-creates next week.

---

### Task 4.3: Dashboard Analytics

**Files:**
- Create: `src/components/features/dashboard/AnalyticsWidget.jsx`
- Modify: `src/components/features/dashboard/Dashboard.jsx`

**Step 1: Install chart library**

```bash
npm install recharts
```

**Step 2: Create AnalyticsWidget**

```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsWidget({ entries, todos }) {
  // Calculate completion stats for last 7 days
  const stats = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      const completed = todos.filter(t =>
        t.completed && t.completed_at?.slice(0, 10) === dateStr
      ).length;

      days.push({
        date: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        completed,
      });
    }
    return days;
  }, [todos]);

  return (
    <div className="bg-white rounded-xl border border-ocean-100 p-6">
      <h3 className="font-heading text-lg text-ocean-900 mb-4">Task Completion</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={stats}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="completed" fill="#0077b6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 3: Add to Dashboard layout**

**Verification:** View chart showing task completion trends.

---

### Task 4.4: Bulk Operations

**Files:**
- Modify: `src/components/features/views/TableView.jsx`
- Modify: `src/components/features/views/ListView.jsx`

**Step 1: Add selection state**

```javascript
const [selectedIds, setSelectedIds] = useState(new Set());

const toggleSelection = (id) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const selectAll = () => {
  setSelectedIds(new Set(entries.map(e => e.id)));
};
```

**Step 2: Add bulk action bar**

```jsx
{selectedIds.size > 0 && (
  <div className="sticky top-0 bg-ocean-500 text-white p-3 rounded-lg flex items-center gap-4">
    <span>{selectedIds.size} selected</span>
    <button onClick={() => bulkUpdateStatus('done')}>Mark Done</button>
    <button onClick={() => bulkArchive()}>Archive</button>
    <button onClick={() => setSelectedIds(new Set())}>Clear</button>
  </div>
)}
```

**Verification:** Select multiple items, apply bulk status change.

---

## Phase 5: Polish

**Goal:** Professional finish, modern capabilities

**Estimated effort:** 1-2 weeks
**Dependencies:** Core features stable

### Task 5.1: Dark Mode

**Files:**
- Create: `src/contexts/ThemeContext.jsx`
- Modify: `src/index.css`
- Modify: `src/App.jsx`

**Step 1: Create ThemeContext**

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

**Step 2: Add CSS variables**

```css
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #f7f7f7;
  --color-text: #1a1a1a;
  --color-text-secondary: #6d6d6d;
  --color-border: #e5e7eb;
}

.dark {
  --color-bg: #1a1a1a;
  --color-bg-secondary: #2d2d2d;
  --color-text: #f7f7f7;
  --color-text-secondary: #a0a0a0;
  --color-border: #404040;
}
```

**Step 3: Add toggle button in header**

```jsx
const { theme, toggle } = useTheme();

<button onClick={toggle} aria-label="Toggle dark mode">
  <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
</button>
```

**Verification:** Toggle works, preference persists on reload.

---

### Task 5.2: PWA Setup

**Files:**
- Modify: `vite.config.js`
- Create: `public/manifest.json`

**Step 1: Install Vite PWA plugin**

```bash
npm install vite-plugin-pwa -D
```

**Step 2: Configure in vite.config.js**

```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Momentum Hub',
        short_name: 'Momentum',
        theme_color: '#0077b6',
        background_color: '#cfebf8',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
```

**Step 3: Create app icons**

Generate 192x192 and 512x512 PNG icons from favicon.

**Verification:** Install prompt appears on mobile, app works offline.

---

### Task 5.3: Loading Skeletons

**Files:**
- Create: `src/components/ui/Skeleton.jsx`
- Modify: Various view components

**Step 1: Create Skeleton component**

```jsx
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-graystone-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 border border-ocean-100">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-4" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
```

**Step 2: Use in loading states**

Replace `<LoadingSpinner />` with contextual skeletons.

**Verification:** Loading states show content placeholders, not spinners.

---

### Task 5.4: Add PropTypes

**Files:**
- Modify: All component files in `src/components/`

**Step 1: Install prop-types**

```bash
npm install prop-types
```

**Step 2: Add to each component**

Example for Dashboard:
```javascript
import PropTypes from 'prop-types';

Dashboard.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    // ... other fields
  })).isRequired,
  currentUser: PropTypes.string,
  onOpenEntry: PropTypes.func.isRequired,
  // ... other props
};
```

**Verification:** Invalid props trigger console warnings in development.

---

## Verification Checklist

After completing all phases, verify:

### Phase 1
- [ ] Error in one component doesn't crash entire app
- [ ] Workstream tasks can be deleted
- [ ] No console.log statements (only Logger)
- [ ] Long text inputs are rejected

### Phase 2
- [ ] React DevTools shows fewer re-renders
- [ ] 200+ item lists scroll smoothly
- [ ] Network tab shows lazy-loaded chunks

### Phase 3
- [ ] App usable on iPhone SE viewport
- [ ] All buttons have aria-labels
- [ ] Can navigate entire app with keyboard only
- [ ] Screen reader announces all actions

### Phase 4
- [ ] Notifications appear in real-time
- [ ] Recurring tasks auto-create
- [ ] Analytics chart shows completion trends
- [ ] Bulk selection and actions work

### Phase 5
- [ ] Dark mode toggle works
- [ ] Theme persists on reload
- [ ] App installable as PWA
- [ ] Loading shows skeletons, not spinners

---

## Summary

| Phase | Effort | Items | Key Deliverable |
|-------|--------|-------|-----------------|
| 1. Foundation | 5 hours | 5 | Stable, error-resilient base |
| 2. Performance | 2 days | 4 | Fast rendering, virtualized lists |
| 3. Mobile & A11y | 3 days | 3 | Works on all devices, inclusive |
| 4. Features | 2-3 weeks | 4 | Notifications, recurring, analytics |
| 5. Polish | 2 weeks | 4 | Dark mode, PWA, professional finish |

**Total estimated effort:** 5-7 weeks for complete implementation

---

*Roadmap created 2026-01-22*
