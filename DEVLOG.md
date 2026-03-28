## 2026-03-28 — Request dashboard route + full-page view
Tool: Codex
Branch: main
Changes:
- Added `/pages/requests/:id` routing in `useNavigation.js` and wired both the main app shell and pages-only shell to render a lazy-loaded `RequestDashboard`
- Updated `PagesView.jsx` so request clicks navigate to the full-page dashboard while keeping the new-request modal flow intact
- Added `src/components/features/pages/dashboard/` with the routed dashboard, hero, milestone progress, health cards, brief/activity/files/timeline/contacts cards, sticky actions bar, and builder notes
- Extended `landingPageRequests.js` with `updatePageUrl` and `appendStatusHistory`, and added migration `023_request_dashboard.sql` for `page_url` and `status_history`
- Ran `npm run build` successfully after the changes
Status: Complete

## 2026-03-28 — Pages Hub attachments + form accessibility
Tool: Claude Sonnet 4.6
Branch: main
Changes:
- Applied migration 022 — added `document_links jsonb` column to `landing_page_requests`, created `request_files` table with RLS policies (select/insert/delete)
- Created `pages-hub-files` storage bucket with 3 storage policies (authenticated select/insert/delete)
- Updated `NewRequestForm.jsx` — added document links section (dynamic URL + label inputs) and file attachments section (multi-file upload, pending list with remove)
- Updated `landingPageRequests.js` — added `fetchRequestFiles`, `uploadRequestFile`, `getRequestFileUrl`, `deleteRequestFile` service functions
- Made "New request" button + form available to all roles; builders/approvers retain Kanban board + "Your requests" section below
Status: Complete — form submission verified end-to-end ✓

## 2026-03-28 — Pages Hub feature integration
Tool: Claude Sonnet 4.6 + Codex (implementer)
Branch: main
Changes:
- Added `supabase/migrations/021_create_landing_pages.sql` — 3 new tables (landing_page_requests, revision_feedback, amendments) with RLS, enums, indexes, and updated_at trigger
- Added `src/services/landingPageRequests.js` — 12 service functions for full request lifecycle
- Added `getPagesRole(email)` to `src/utils/auth.js` — maps admin→builder, manager→approver, else→requester
- Added `src/hooks/useLandingPageRequests.js` — role-scoped data fetching hook
- Added `src/components/features/pages/` — full feature module: PagesView, KanbanBoard (7 cols), RequestList, RequestCard, RequestDetail, RequestTimeline, RequestStatusActions, AmendmentQueue, NewRequestForm, RevisionFeedbackForm, StatusBadge, PageTypeBadge
- Updated `Sidebar.jsx` — added CAMPAIGNS section with Pages nav item
- Updated `App.jsx` — lazy import PagesView, getPagesRole, added case 'pages' route
Status: Complete — verified in browser ✓

## 2026-03-28 — Pages Hub bug fixes + env config
Tool: Claude Sonnet 4.6
Branch: main
Changes:
- Applied `supabase/migrations/021_create_landing_pages.sql` to project `jzalaltexmotkusvqoew` — all 3 tables confirmed created
- Wrote `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so app can authenticate
- Fixed `src/hooks/useNavigation.js` — added `'pages': '/pages'` to `SIMPLE_ROUTES` (missing entry caused navigate('pages') to fall through to '/' and stay on Dashboard)
- Fixed `src/App.jsx` — wrapped lazy `<PagesView>` in `<Suspense fallback={<LoadingSpinner />}>` (all other lazy views had this; pages case was missing it)
Status: Complete — Pages Hub renders end-to-end: login → CAMPAIGNS → Pages → Kanban board (empty state, "Nothing here")
