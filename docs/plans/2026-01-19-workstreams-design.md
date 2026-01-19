# Workstreams Feature Design

## Overview

A feature for managing ongoing, never-closing work buckets (e.g., "Momentum Hub Development", "Website Requests") containing tasks organized into two lanes: time-sensitive and priority backlog.

## Data Model

### Workstream (container)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| title | string | e.g., "Momentum Hub Development" |
| description | text | Optional context/purpose |
| owner | string | Creator, manages settings |
| visibility | enum | `personal` or `shared` |
| color | string | For visual distinction |
| created_at | timestamp | |

### Workstream Task

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | Primary key |
| workstream_id | uuid | Parent workstream |
| title | string | |
| description | text | Rich text/markdown |
| priority | enum | `high`, `medium`, `low` |
| sort_order | int | For drag-to-reorder within priority |
| deadline | date | Optional - if set, appears in time-sensitive lane |
| assignee | string | Who's working on it |
| requester | string | Who asked for it |
| tags | string[] | Flexible categorization |
| status | enum | `open`, `in_progress`, `done` |
| linked_items | uuid[] | Links to Projects/Jobs |
| created_at | timestamp | |

Comments and attachments use existing patterns from Projects.

## Navigation & Views

### Navigation

New "Workstreams" item in left sidebar alongside Projects and Jobs.

### Workstream List View

- Cards showing: title, color badge, task counts, owner
- "New Workstream" button
- Filter: All / Personal / Shared

### Individual Workstream View

Two-column layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back]   Website Requests                        [Settings]  │
│  Managing incoming website and landing page requests            │
├────────────────────────────┬────────────────────────────────────┤
│  TIME-SENSITIVE (4)        │  BACKLOG                           │
│  Sorted by deadline        │  ┌─ HIGH (2) ─────────────────────┐│
│                            │  │ □ Redesign contact form        ││
│  □ Update privacy policy   │  │ □ Add testimonials section     ││
│    Due: Jan 22 · Sarah     │  └────────────────────────────────┘│
│                            │  ┌─ MEDIUM (5) ───────────────────┐│
│  □ Fix broken link on FAQ  │  │ □ SEO meta descriptions        ││
│    Due: Jan 24 · Dan       │  │ □ Mobile nav improvements      ││
│                            │  │ ...                            ││
│  ...                       │  └────────────────────────────────┘│
│                            │  ┌─ LOW (3) ──────────────────────┐│
│                            │  │ □ Favicon update               ││
│  [+ Add time-sensitive]    │  │ ...                            ││
│                            │  └────────────────────────────────┘│
│                            │  [+ Add to backlog]                │
└────────────────────────────┴────────────────────────────────────┘
```

- Drag tasks within and between priority sections
- Drag from Backlog → Time-sensitive (prompts for deadline)
- Click task to open detail panel

## Task Detail Panel

Slides in when clicking a task:

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back to Workstream]                      [Mark Done] [···]  │
├─────────────────────────────────────────────────────────────────┤
│  Redesign contact form                                          │
│  ────────────────────────────────────────────────────────────── │
│                                                                 │
│  ┌─ DETAILS ───────────────────────────────────────────────────┐│
│  │ Priority: [HIGH ▼]        Status: [Open ▼]                  ││
│  │ Deadline: [Not set]       Assignee: [Dan ▼]                 ││
│  │ Requester: Sarah          Added: Jan 15, 2026               ││
│  │ Tags: [website] [forms] [+ Add]                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ DESCRIPTION ───────────────────────────────────────────────┐│
│  │ The current contact form is outdated and doesn't match      ││
│  │ the new brand guidelines. Sarah wants it updated with...    ││
│  │                                            [Edit]           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ LINKED ITEMS ──────────────────────────────────────────────┐│
│  │ 📁 Website Rebrand Project              [+ Link item]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ ATTACHMENTS ───────────────────────────────────────────────┐│
│  │ 📎 brand-guidelines.pdf    📎 mockup.png    [+ Add]         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ COMMENTS ──────────────────────────────────────────────────┐│
│  │ Sarah · 2 days ago                                          ││
│  │ "Can we also add a file upload field? @Dan"                 ││
│  │ ────────────────────────────────────────────────────────────││
│  │ Dan · 1 day ago                                             ││
│  │ "Sure, I'll add that to the spec"                           ││
│  │ ────────────────────────────────────────────────────────────││
│  │ [Write a comment...]                            [Post]      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

Key interactions:
- All fields editable inline
- @mentions in comments trigger notifications
- Setting deadline moves task to time-sensitive lane
- Clearing deadline moves to backlog at current priority
- "Mark Done" moves to completed

## Dashboard Integration

### Today's Tasks

Time-sensitive workstream tasks due today appear alongside todos and jobs:

```
┌─ TODAY'S TASKS ────────────────────────────────────────────────┐
│  □ Review budget proposal                         [Personal]   │
│  □ Update privacy policy                          [Workstream] │
│    ↳ Website Requests · Due today                              │
│  □ Fix broken link on FAQ                         [Workstream] │
│    ↳ Website Requests · Due today                              │
│  ☑ Team standup                                   [Personal]   │
│                                                                │
│  4 tasks · 1 completed                     [+ Add task]        │
└────────────────────────────────────────────────────────────────┘
```

### Calendar

Workstream tasks with deadlines show on calendar with distinct color/icon.

### Stat Cards

Fourth card added:

| Projects | Subtasks | Jobs | Workstream Tasks |
|----------|----------|------|------------------|
| 12       | 28       | 8    | 14               |

Clicking opens modal showing assigned tasks across all workstreams.

### Mentions Feed

Comments on workstream tasks where user is mentioned or assigned appear in Mentions & Activity.

## Sharing & Permissions

### Visibility Options

- **Personal** - Only creator can see, tasks only on their dashboard
- **Shared** - All team members can view and add tasks

### Shared Workstream Permissions

- Owner: rename, change visibility, delete workstream
- All team members: add tasks, edit tasks, comment, change priority/status
- Task assignee: receives notifications for comments and deadline reminders

### Settings Panel

```
┌─ WORKSTREAM SETTINGS ──────────────────────────────────────────┐
│  Title: [Website Requests                    ]                 │
│                                                                │
│  Description:                                                  │
│  [Managing incoming website and landing page requests    ]     │
│                                                                │
│  Color: [●] Blue  [○] Green  [○] Purple  [○] Orange           │
│                                                                │
│  Visibility:                                                   │
│  [○] Personal - Only visible to me                            │
│  [●] Shared - Visible to all team members                     │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│  Owner: Dan                                                    │
│  Created: Jan 15, 2026                                         │
│                                                                │
│  [Delete Workstream]                              [Save]       │
└────────────────────────────────────────────────────────────────┘
```

## Implementation Scope

### Database

- New migration: `workstreams` and `workstream_tasks` tables
- RLS policies for visibility (personal vs shared)

### Frontend Components

- WorkstreamList - list view with filters
- WorkstreamView - two-column task layout with drag-and-drop
- WorkstreamTaskDetail - detail panel
- WorkstreamSettings - settings modal
- Updates to Dashboard, Calendar, Mentions components

### Integration Points

- Navigation sidebar
- Dashboard stat cards
- Today's Tasks section
- Calendar events
- Mentions feed
- Notification system (email triggers)
