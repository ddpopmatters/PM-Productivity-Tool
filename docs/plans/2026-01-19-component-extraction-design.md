# Component Extraction Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Incrementally extract components from legacy.html (22k lines) into modular Vite-built files using a bottom-up approach.

**Architecture:** Extract leaf components first, register them globally via a bridge bundle, then replace inline definitions in legacy.html. Both systems coexist during migration.

**Tech Stack:** React 18, Vite, Tailwind CSS, existing Supabase infrastructure

---

## Component Hierarchy & Extraction Order

### Tier 1 - Pure UI Components (no dependencies)
- `LoadingSpinner` - simple loading indicator
- `Badge` - status/label badges
- `Button` - reusable button component
- `Pagination` - page navigation

### Tier 2 - Simple Utilities (depend on Tier 1)
- `Toast` / notification system
- `Modal` - base modal wrapper
- `ConfirmDialog` - confirmation prompts

### Tier 3 - Form Components
- `SearchInput` - search with debounce
- `DatePicker` - date selection
- Select / dropdowns

### Tier 4 - Feature Components (depend on Tier 1-3)
- `KanbanColumn` → `KanbanBoard`
- `ListView` / `TableView`
- `CalendarWidget`
- `TodaysTasks`

### Tier 5 - Page Components
- `Dashboard`
- `ManagerHub`
- `AdminConsole`
- `WorkstreamView`

### Tier 6 - App Shell
- `Navigation` / `Sidebar`
- `App` (main router)
- Auth flow components

---

## File Structure

```
src/
├── components/
│   ├── ui/                    # Tier 1-2: Pure UI
│   │   ├── LoadingSpinner.jsx
│   │   ├── Badge.jsx
│   │   ├── Button.jsx
│   │   ├── Pagination.jsx
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   └── index.js
│   │
│   ├── forms/                 # Tier 3: Form components
│   │   ├── SearchInput.jsx
│   │   ├── DatePicker.jsx
│   │   └── index.js
│   │
│   ├── features/              # Tier 4: Feature components
│   │   ├── kanban/
│   │   ├── calendar/
│   │   ├── dashboard/
│   │   └── ...
│   │
│   └── layout/                # Tier 6: App shell
│       ├── Navigation.jsx
│       ├── Sidebar.jsx
│       └── index.js
│
├── pages/                     # Tier 5: Full page components
│   ├── Dashboard.jsx
│   ├── ManagerHub.jsx
│   └── AdminConsole.jsx
│
├── hooks/                     # Custom hooks
│   ├── useDebounce.js
│   ├── useLocalStorage.js
│   └── index.js
│
├── contexts/                  # Already exists
│   └── AppContext.jsx
│
└── legacy-bridge.js           # Exposes components to legacy.html
```

---

## Legacy Bridge Strategy

### Problem
legacy.html uses inline `<script type="text/babel">` tags. It cannot directly import ES modules.

### Solution
Create a bridge bundle that registers extracted components on `window`:

```javascript
// src/legacy-bridge.js
import { LoadingSpinner, Badge, Button, Pagination } from './components/ui';

window.MomentumComponents = {
  LoadingSpinner,
  Badge,
  Button,
  Pagination,
};
```

### Usage in legacy.html

```html
<!-- Load bridge before app script -->
<script src="./dist/legacy-bridge.js"></script>

<script type="text/babel">
  // Use bridged components
  const { LoadingSpinner, Badge, Button } = window.MomentumComponents;

  // Rest of app uses them normally
</script>
```

### Vite Config for Bridge Bundle

```javascript
// vite.config.js - add build.rollupOptions for legacy bundle
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        'legacy-bridge': 'src/legacy-bridge.js',
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
```

---

## Tier 1 Implementation Tasks

### Task 1: Extract LoadingSpinner

**Files:**
- Create: `src/components/ui/LoadingSpinner.jsx`

**Source location in legacy.html:** ~line 836

**Component code:**
```jsx
import React from 'react';

const LoadingSpinner = React.memo(function LoadingSpinner({
  size = "md",
  text = "",
  className = ""
}) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4"
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-ocean-500 border-t-transparent rounded-full animate-spin`}></div>
      {text && <p className="mt-2 text-graystone-600 text-sm">{text}</p>}
    </div>
  );
});

export default LoadingSpinner;
```

---

### Task 2: Extract Badge

**Files:**
- Create: `src/components/ui/Badge.jsx`

**Source location in legacy.html:** ~line 854

**Component code:**
```jsx
import React from 'react';

const Badge = React.memo(function Badge({
  variant = 'default',
  className = '',
  children
}) {
  const variants = {
    default: 'bg-graystone-100 text-graystone-700',
    primary: 'bg-ocean-100 text-ocean-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-aqua-100 text-aqua-700'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
});

export default Badge;
```

---

### Task 3: Extract Button

**Files:**
- Create: `src/components/ui/Button.jsx`

**Source location in legacy.html:** ~line 876

**Component code:**
```jsx
import React from 'react';

const Button = React.memo(function Button({
  type = "button",
  variant = "solid",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  children,
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    solid: "bg-ocean-500 text-white hover:bg-ocean-600 focus:ring-ocean-500",
    outline: "border-2 border-ocean-500 text-ocean-600 hover:bg-ocean-50 focus:ring-ocean-500",
    ghost: "text-ocean-600 hover:bg-ocean-50 focus:ring-ocean-500",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});

export default Button;
```

---

### Task 4: Extract Pagination

**Files:**
- Create: `src/components/ui/Pagination.jsx`

**Source location in legacy.html:** ~line 926

**Component code:**
```jsx
import React from 'react';

const Pagination = React.memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showEllipsisStart = currentPage > 3;
  const showEllipsisEnd = currentPage < totalPages - 2;

  if (showEllipsisStart) {
    pages.push(1);
    if (currentPage > 4) pages.push('...');
  }

  for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
    if (!pages.includes(i)) pages.push(i);
  }

  if (showEllipsisEnd) {
    if (currentPage < totalPages - 3) pages.push('...');
    if (!pages.includes(totalPages)) pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-graystone-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {pages.map((page, idx) => (
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-graystone-400">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg font-medium transition-colors ${
              currentPage === page
                ? 'bg-ocean-500 text-white'
                : 'hover:bg-graystone-100 text-graystone-700'
            }`}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-graystone-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
});

export default Pagination;
```

---

### Task 5: Create UI index.js

**Files:**
- Create: `src/components/ui/index.js`

```javascript
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as Badge } from './Badge';
export { default as Button } from './Button';
export { default as Pagination } from './Pagination';
```

---

### Task 6: Create Legacy Bridge

**Files:**
- Create: `src/legacy-bridge.js`

```javascript
import { LoadingSpinner, Badge, Button, Pagination } from './components/ui';

// Register components globally for legacy.html
window.MomentumComponents = {
  LoadingSpinner,
  Badge,
  Button,
  Pagination,
};

console.log('[Legacy Bridge] Components registered:', Object.keys(window.MomentumComponents));
```

---

### Task 7: Update Vite Config

**Files:**
- Modify: `vite.config.js`

Add legacy bridge as separate entry point with IIFE format for browser compatibility.

---

### Task 8: Update legacy.html

**Files:**
- Modify: `legacy.html`

1. Add script tag to load bridge bundle
2. Replace inline component definitions with bridged versions
3. Verify functionality

---

## Verification Checklist

- [ ] `npm run build` succeeds
- [ ] `dist/legacy-bridge.js` is generated
- [ ] Vite dev server shows components working
- [ ] legacy.html loads bridge successfully
- [ ] All 4 components render correctly in legacy.html
- [ ] No console errors in either environment
- [ ] Visual appearance unchanged

---

*Design created 2026-01-19*
