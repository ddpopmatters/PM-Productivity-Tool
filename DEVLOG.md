## 2026-06-11 — Repo repair: commit stranded cockpit work, hardening, and housekeeping
Tool: Claude Code (Fable 5)
Branch: chore/commit-stranded-cockpit-and-hardening
Changes:
- Committed the previously uncommitted Cockpit live bridge + action poller feature (services, tests, App/Dashboard wiring, a11y fixes).
- Committed supply-chain hardening: IOC guard workflow, npm/wrangler pinning, `.npmrc` min-release-age, CSP meta in index.html.
- Added `.nvmrc` (Node 20) to match CI; gitignored `.vercel/`, `.mcp-todos.json`, `.hermes-worktrees/`; untracked `.DS_Store`.
- Assessment flagged remaining debt: 9 of 13 services untested (worst: websiteProject.js, 1114 lines), App.jsx at 1310 lines with cockpit polling inline, BrainDumpInbox bypassing the service layer with direct `.from('brain_dumps')` calls.
Verification:
- Ran `npm run lint`: clean.
- Ran `npm run test -- --run`: 464 tests passed (40 files).
Status: Complete

## 2026-05-11 — PM Productivity intake from cockpit
Tool: Codex
Branch: main
Changes:
- Extended the cockpit bridge poller to read PM Productivity intake requests from the local cockpit.
- Added creation handlers for workflow tasks, workflow projects, workstream tasks, and personal to-dos using the existing signed-in PM Productivity Tool methods.
- Added intake result reporting so synced items leave the cockpit queue and failures are visible.
- Passed the required item, workstream, and personal to-do creation methods into the cockpit poller from the main app.
Verification:
- Ran `npm test -- src/services/cockpitActions.test.js src/services/cockpitSync.test.js`: 6 tests passed.
- Ran `npm run lint`.
- Ran `npm run build`.
Status: Complete

## 2026-05-11 — PM Hermes Cockpit action bridge refinement
Tool: Codex
Branch: main
Changes:
- Extended the cockpit quick-action poller to apply approved completion actions for workstream tasks and personal to-dos.
- Kept workflow item archive actions on the existing authenticated update path.
- Returned updated personal to-do records from `useTodos.updateTodo` so cockpit action success can be reported accurately.
- Cleaned dashboard duplicate-key sources and form-field console warnings.
- Updated the local CSP meta policy so the Lucide CDN source map request is not blocked, and removed ignored meta-only frame directives.
- Documented the approved PM Hermes Cockpit bridge in `PROJECT.md`.
Verification:
- Ran `npm test -- src/services/cockpitActions.test.js src/services/cockpitSync.test.js`: 5 tests passed.
- Ran `npm run build`.
- Used the in-app browser to confirm the signed-in PM Productivity Tool dashboard loads and the console is clean apart from normal Vite/React development notices.
Status: Complete

## 2026-05-10 — PM Hermes Cockpit quick actions
Tool: Codex
Branch: main
Changes:
- Added a cockpit quick-action poller that reads pending trusted PM Productivity actions from the local PM Hermes Cockpit.
- Wired Archive requests to the existing authenticated workflow item update path, so the PM tool applies the archive using Dan’s signed-in session.
- Added action-result reporting back to the cockpit so completed or failed actions leave the pending queue.
- Added regression coverage for applying a cockpit Archive request.
Verification:
- Ran `npm run lint`.
- Ran `npm run test -- --run`: 462 tests passed.
- Ran `npm run build`.
- Restarted the local PM Productivity Tool server at `http://127.0.0.1:3000/PM-Productivity-Tool/`.
- Used the in-app browser to confirm the signed-in PM tool still loads; known pre-existing console warnings remain in the dashboard key/CSP meta areas, but no cockpit action CSP block appeared.
Status: Complete

## 2026-05-10 — PM Hermes Cockpit live bridge
Tool: Codex
Branch: main
Changes:
- Added a browser-side live bridge that publishes authenticated PM Productivity Tool state to the local PM Hermes Cockpit ingest endpoint.
- Added a snapshot builder for workflow items, workstreams, workstream tasks, personal todos, and calendar events, with field names normalised for the cockpit connector.
- Debounced cockpit sync from the main app once authenticated work data has loaded, including empty authenticated snapshots so stale cockpit counts can clear.
- Allowed the local cockpit endpoint through the PM Productivity Tool content security policy.
- Added regression coverage for the cockpit snapshot payload contract and CSP bridge allowance.
Verification:
- Ran `npm run lint`.
- Ran `npm run test -- --run`: 461 tests passed.
- Ran `npm run test -- src/services/cockpitSync.test.js --run`: 3 tests passed after the CSP follow-up.
- Ran `npm run build`.
- Used the in-app browser after sign-in to confirm the PM Productivity Tool published a live snapshot to the cockpit: 120 workflow items, 11 workstreams, 54 workstream tasks, and 5 personal todos.
- Confirmed the cockpit now reads `local_snapshot` data and shows `PM WORK 117` and `PM PROJECTS 12`.
Status: Complete

## 2026-05-12 — PM Productivity intake result links
Tool: Codex
Branch: main
Changes:
- Extended cockpit intake creation results with the created PM Productivity Tool target type, id, and URL.
- Added result metadata for workflow items, workstream tasks, and personal to-dos so the cockpit can show a plain created-item link in intake history.
- Verified a harmless live bridge request created `Cockpit live bridge test - safe to archive`, reported the item URL back to the cockpit, and was then archived through the cockpit quick-action bridge.
Verification:
- Ran `npm test -- src/services/cockpitActions.test.js`: 3 tests passed.
- Ran `npm test -- src/services/cockpitActions.test.js src/services/cockpitSync.test.js`: 6 tests passed.
- Ran `npm run lint`.
- Ran `npm run build`.
- Used the in-app browser to confirm the signed-in PM Productivity Tool consumed the cockpit intake queue and reported completion back to the cockpit.
Status: Complete
