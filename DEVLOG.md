## 2026-03-30 — Telegram bot interactive routing

Tool: Claude Code (claude-sonnet-4-6)
Branch: main
Changes:
- Added `supabase/functions/telegram-bot/index.ts`: Deno edge function with 8-destination inline keyboard routing; two-step workstream task picker; editMessageText confirmation flow
- Added `supabase/migrations/033_brain_dumps_telegram_context.sql`: telegram_chat_id + telegram_message_id columns on brain_dumps for callback lookup without embedding IDs in button data
- Applied migration to remote database; deployed edge function with --use-api (Docker bypass); registered webhook at jzalaltexmotkusvqoew.supabase.co/functions/v1/telegram-bot
- Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, OWNER_NAME, OWNER_EMAIL secrets in Supabase project
Status: Complete

## 2026-03-30 — Invite claim and resend profile fixes
Tool: Codex
Branch: main
Changes:
- Updated `supabase/functions/invite-user/index.ts` so invite profile writes now insert new rows, but on duplicate email only refresh `invited_at` and `invited_by`, preserving existing `name`, `team`, and `role`
- Updated `src/components/features/auth/AuthCallback.jsx` so invite claims create a missing `user_profiles` row with `email` and `claimed_at`, and handle duplicate-row races before falling back to a null-only `claimed_at` update
- Updated `src/utils/logger.js` so `Logger.warn()` always emits, making RLS-denied invite claim writes visible in production logs
- Ran `npm run build` successfully after implementation
Status: Complete

## 2026-03-29 — Website project management v2 expansion
Tool: Codex
Branch: main
Changes:
- Added `supabase/migrations/031_website_project_v2.sql` for website page inventory fields, bespoke templates, page dependencies, decisions, indexes, triggers, and authenticated RLS policies
- Extended `src/services/websiteProject.js` and `src/hooks/useWebsiteProject.js` with template, dependency, decision, and launch-readiness loading/mutation flows, plus the new website page fields
- Added `PageInventory.jsx`, `TemplateTracker.jsx`, `DecisionsLog.jsx`, and `LaunchReadiness.jsx` to cover grouped page inventory management, template reuse tracking, decisions logging, and per-section launch progress
- Updated `WebsiteView.jsx`, `BuildView.jsx`, and `OngoingView.jsx` to surface the new data through build/live tab bars while keeping the existing phase, registry, and change request flows intact
- Ran `npm run build` successfully after implementation
Status: Complete

## 2026-03-29 — Website sitemap planner
Tool: Codex
Branch: main
Changes:
- Added `supabase/migrations/033_website_sitemap.sql` for `website_sitemap_nodes`, supporting indexes, the `updated_at` trigger, and authenticated RLS policies
- Extended `src/services/websiteProject.js` and `src/hooks/useWebsiteProject.js` with sitemap node fetch/create/update/delete/import flows plus sitemap state and reload handlers
- Added `src/components/features/website/SitemapView.jsx` with a 3-level sitemap tree, inline name and slug editing, linked-page resolution, node detail editing, and import-from-pages support
- Updated `BuildView.jsx` and `OngoingView.jsx` to add the new Sitemap tab between the existing website planning tabs
- Ran `npm run build` successfully after implementation
Status: Complete

## 2026-03-29 — Website project management feature
Tool: Codex
Branch: main
Changes:
- Added `supabase/migrations/030_create_website_project.sql` for website projects, fixed phases, tasks, pages, change requests, indexes, updated_at triggers, and authenticated RLS policies
- Added `src/services/websiteProject.js` and `src/hooks/useWebsiteProject.js` to load the active website project, seed phases on creation, manage tasks/pages/change requests, and handle launch/archive flows
- Added `src/components/features/website/` with the build-phase workflow, phase accordions, inline task management, live page registry, and post-launch change request management UI
- Updated `src/App.jsx`, `src/hooks/useNavigation.js`, `src/hooks/index.js`, and `src/components/features/navigation/Sidebar.jsx` to register the Website route/view and sidebar navigation
- Ran `npm run build` successfully after implementation
Status: Complete

## 2026-03-28 — Request dashboard HTML draft upload + preview
Tool: Codex
Branch: main
Changes:
- Added `BuilderDraftCard.jsx` so builders can upload `.html` drafts, see the latest uploaded file, and replace it with a newer version from the dashboard sidebar
- Added `DraftPreviewPanel.jsx` at the top of the left column to surface the latest uploaded HTML draft and render it inline in a sandboxed 600px iframe on demand
- Updated `RequestDashboard.jsx` to place the draft preview ahead of the brief and the builder upload card ahead of builder notes
- Updated `FilesCard.jsx` to refresh when the parent dashboard request state refreshes, so newly uploaded draft files appear in the existing files list without a full reload
- Ran `npm run build` successfully after the changes
Status: Complete

## 2026-03-28 — Request dashboard turn-based workflow
Tool: Codex
Branch: main
Changes:
- Updated `dashboardUtils.js` so `in_progress` now hands off to `first_draft` and added `getTurnInfo(request, pagesRole, feedbackItems)` for feedback-aware turn ownership and CTA metadata
- Added `src/components/features/pages/dashboard/TurnBanner.jsx` and wired it into `RequestDashboard.jsx` below the health cards with builder/requester/approver/done states
- Refactored `ActionsBar.jsx` to use turn-aware labels and actions, including requester re-submit on `needs_more_info`, approver review controls on `first_draft`, and feedback-gated revision submit actions
- Passed `feedbackItems` through the dashboard shell so both the banner and sticky actions respond to revision round feedback state
- Ran `npm run build` successfully after the changes
Status: Complete

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

## 2026-03-28 — Request dashboard comments + mentions
Tool: Codex
Branch: main
Changes:
- Added `supabase/migrations/024_request_comments.sql` for the `request_comments` table, request index, RLS enablement, and authenticated access policy
- Extended `src/services/landingPageRequests.js` with `fetchComments` and `addComment` using the existing `getSupabase()` and `Logger.error()` patterns
- Added `src/components/features/pages/dashboard/CommentThread.jsx` with comment loading/posting, `@`-mention autocomplete from `SEED_USERS`, stored mention emails, and highlighted mentions in rendered comments
- Wired `CommentThread` into `RequestDashboard.jsx` below the activity feed in the left column
- Ran `npm run build` successfully after the changes
Status: Complete

## 2026-03-28 — Landing page copy brief fields
Tool: Codex
Branch: main
Changes:
- Added `supabase/migrations/025_copy_brief_fields.sql` for the new copy brief columns on `landing_page_requests`
- Extended `NewRequestForm.jsx` with a new Copy brief section, including conditional donate-only price point rows and submit-time serialisation for all five fields
- Updated `landingPageRequests.js` so `createRequest()` persists the new copy brief payload to Supabase
- Extended dashboard brief rendering in `dashboardUtils.js` and `BriefPanel.jsx` so populated copy fields appear under a dedicated "Copy brief" subheading
- Ran `npm run build` successfully after the changes
Status: Complete

## 2026-03-29 — Brain Dump Inbox view added to Momentum Hub

Tool: Claude Code (claude-sonnet-4-6)
Branch: feature/content-hub-style-migration

Changes:
- Added `BrainDumpInbox.jsx` component — loads pending brain_dumps from Supabase, shows source/age tags, routes to workstream tasks, park, or archive
- Wired into navigation: `/braindump` route, "Brain Dump Inbox" sidebar item (below Workstreams)
- Exports added to features index

Status: Complete (runtime tested — routing to workstream confirmed working)

## 2026-03-30 — Invite flow fixes
Tool: Codex
Branch: main
Changes:
- Updated `supabase/functions/invite-user/index.ts` and `supabase/functions/delete-invite/index.ts` to use `listUsers({ perPage: 1000 })` so invite lookups cover the full internal user base
- Added invite role validation in `supabase/functions/invite-user/index.ts` so invalid role values return a 400 before touching `user_profiles`
- Added `SUPABASE_API.logActivity()` in `src/App.jsx` to insert invite activity rows into `activity_log`, and passed it into `AdminConsole`
- Updated `src/components/features/admin/AdminConsole.jsx` to accept `logActivity` and record invite-send actions from both invite entry points
- Ran `npm run build` successfully after the changes
Status: Complete
