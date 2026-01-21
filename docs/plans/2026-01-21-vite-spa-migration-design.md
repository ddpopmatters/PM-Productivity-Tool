# Vite SPA Migration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from legacy.html hybrid architecture to a modern Vite SPA for improved longevity and security.

**Architecture:** Single App.jsx with all state, state-based view routing, data fetching in App component. No new dependencies.

**Tech Stack:** React 18, Vite, Supabase, Tailwind CSS (all existing)

---

## Current State

- `legacy.html` - Monolithic file with inline App component (~4000 lines)
- `src/components/` - 56 extracted components ready to use
- `src/App.jsx` - Placeholder linking to legacy.html
- `src/contexts/AppContext.jsx` - Auth handling (keep as-is)
- `src/api/supabase.js` - Supabase client (keep as-is)

## Target State

```
src/
├── main.jsx              # Entry point (exists)
├── App.jsx               # Full app logic (~1200 lines)
├── index.css             # Tailwind styles (exists)
│
├── api/
│   └── supabase.js       # Supabase client (exists)
│
├── contexts/
│   └── AppContext.jsx    # Auth only (exists)
│
├── components/
│   ├── ui/               # 7 components (exists)
│   └── features/         # 56 components (exists)
│
└── utils/
    ├── config.js         # App config + constants
    └── logger.js         # Logger (exists)
```

---

## App.jsx Structure

```jsx
// 1. Imports (~30 lines)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from './contexts';
import { getSupabase } from './api/supabase';
import { Logger } from './utils/logger';
import { APP_CONFIG, USERS, TEAMS, KANBAN_STATUSES, ... } from './utils/config';
// Import all components from features/

// 2. App Component
export default function App() {
  const { authChecked, isAuthenticated, userEmail, currentUser, ... } = useApp();

  // 3. State declarations (~50 useState, ~100 lines)
  const [entries, setEntries] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  // ... all other state

  // 4. Data fetching useEffects (~150 lines)
  useEffect(() => { /* load entries */ }, []);

  // 5. Handler functions (~400 lines)
  const handleUpdateEntry = useCallback(...);

  // 6. Render with view switching (~500 lines)
  if (!authChecked) return <LoadingSpinner />;
  if (!isAuthenticated) return <LoginScreen />;

  return (
    <div className="app-container">
      <Sidebar ... />
      <main>
        {currentView === 'dashboard' && <Dashboard ... />}
        {currentView === 'jobs' && <JobsView ... />}
        {/* ... other views */}
      </main>
    </div>
  );
}
```

---

## Migration Phases

### Phase 1: Prepare Config and Constants
- Move constants from legacy.html to `src/utils/config.js`:
  - KANBAN_STATUSES
  - STICKY_COLORS
  - SUPABASE_API object
  - WHITEBOARD_API object
  - Any other shared constants

### Phase 2: Build New App.jsx
- Copy from legacy.html App function:
  - State declarations (~50 useState calls)
  - Data fetching useEffects
  - Handler functions
  - View switching render logic
- Import all 56 components from features/
- Wire up component props

### Phase 3: Update Entry Point
- Modify `index.html` to load Vite app directly (remove legacy redirect)
- Ensure Tailwind and styles load correctly

### Phase 4: Test and Verify
- Run `npm run dev`
- Test each verification item (see checklist below)
- Fix any issues

### Phase 5: Cleanup (Optional, after verification)
- Remove legacy.html or move to /archive
- Remove legacy-bridge.js and build:bridge script
- Update any documentation

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/utils/config.js` | Extend | Add constants from legacy.html |
| `src/App.jsx` | Rewrite | Full app logic |
| `index.html` | Update | Remove legacy redirect |

## Files to Keep (Backup)

| File | Reason |
|------|--------|
| `legacy.html` | Rollback option |
| `src/legacy-bridge.js` | Remove after verified |
| `lib/legacy-bridge.js` | Remove after verified |

---

## Verification Checklist

### Auth Flow
- [ ] Login screen appears when not authenticated
- [ ] Login with email/password works
- [ ] Session persists on refresh
- [ ] Logout works
- [ ] Auth callback handles email confirmation

### Dashboard
- [ ] Stats cards show correct counts
- [ ] Calendar renders with events
- [ ] Today's tasks shows todos + jobs
- [ ] Mentions feed shows activity

### Views
- [ ] Personal view loads entries
- [ ] Jobs view loads jobs
- [ ] Calendar view works
- [ ] Admin console (admin only)
- [ ] Manager hub (managers only)
- [ ] Workstreams view
- [ ] Whiteboards view
- [ ] Productivity tools

### CRUD Operations
- [ ] Create new entry
- [ ] Update entry
- [ ] Delete entry
- [ ] Add/edit/delete subtasks
- [ ] Add/edit/delete comments
- [ ] Toggle todo completion

### Data Sync
- [ ] Changes save to Supabase
- [ ] Data loads on refresh
- [ ] Error handling for failed saves

### UI Features
- [ ] Sidebar navigation works
- [ ] Modals open and close
- [ ] Keyboard shortcuts work
- [ ] Search modal works
- [ ] Notifications appear

---

## Rollback Plan

If issues arise:
1. Revert `index.html` to redirect to legacy.html
2. Legacy app continues working unchanged
3. Fix issues in src/ without affecting production

---

## Estimated Effort

| Phase | Lines Changed | Complexity |
|-------|---------------|------------|
| Phase 1: Config | ~100 | Low |
| Phase 2: App.jsx | ~1200 | Medium |
| Phase 3: Entry point | ~10 | Low |
| Phase 4: Testing | 0 | Medium |
| Phase 5: Cleanup | ~50 | Low |

**Total:** ~1350 lines, mostly copy/adapt from legacy.html
