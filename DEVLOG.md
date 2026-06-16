## 2026-06-16 — Telegram Mini App production URL
Tool: Codex
Branch: main
Changes:
- Pointed Hermes' Telegram Mini App URL at `https://ddpopmatters.github.io/PM-Productivity-Tool/?start=start-of-day` because the branded WordPress `/workstream-tool/` page is currently an iframe wrapper that does not pass parent query parameters into the embedded app.
- Made the React router basename use Vite's configured base path instead of the old hardcoded `/PM-Productivity-Tool/` path.
- Added query/start-parameter routing so the production base URL can open Start Of Day without relying on server-side SPA fallback for `/start-of-day`.
Verification:
- Confirmed `https://populationmatters.org/workstream-tool/` returns `200 OK`.
- Confirmed `https://populationmatters.org/workstream-tool/start-of-day` currently returns `404`, so the query-param launch route is necessary.
- Confirmed the WordPress `/workstream-tool/` page embeds `https://ddpopmatters.github.io/PM-Productivity-Tool/` in an iframe; WordPress credentials are still needed to update the wrapper if the branded URL should deep-link Start Of Day.
- Ran `CODEX_ALLOW_HOME_WORK=1 npm run test -- src/services/startOfDay.test.js src/utils/telegramMiniApp.test.js`: 9 tests passed.
- Ran `CODEX_ALLOW_HOME_WORK=1 npm run lint`: clean.
- Ran `CODEX_ALLOW_HOME_WORK=1 npm run build`: succeeds.
- Ran `CODEX_ALLOW_HOME_WORK=1 VITE_APP_BASE_PATH=/workstream-tool/ npm run build`: succeeds.
Status: Complete

## 2026-06-15 — Start Of Day packet and Telegram Mini App route
Tool: Codex
Branch: main
Changes:
- Added a first-class Start Of Day route and sidebar entry for Hermes' daily packet.
- Added a Supabase service and data contract for packets, packet items, and acknowledgement status.
- Added Telegram Mini App bootstrapping and allowed Telegram's official web app script through the CSP.
- Documented the project plan, Mini App rollout plan, and Supabase schema contract.
- Applied the additive PM Supabase migration for `start_of_day_packets` and `start_of_day_items` with RLS enabled.
- Added the Hermes `generate-start-of-day-packet.py` writer and wired it into the existing morning brief generator.
Verification:
- Ran `CODEX_ALLOW_HOME_WORK=1 npm run test -- src/services/startOfDay.test.js src/utils/telegramMiniApp.test.js`: 9 tests passed.
- Ran `CODEX_ALLOW_HOME_WORK=1 npm run build`: succeeds.
- Ran `CODEX_ALLOW_HOME_WORK=1 npm run lint`: clean.
- Ran `python3 -m py_compile` against the updated Hermes morning scripts.
- Ran `python3 /Users/dan/.hermes/scripts/generate-start-of-day-packet.py`: created the 2026-06-15 packet with 20 items.
- Directly called `generate_start_of_day_packet_status()` from the morning generator: returned the existing packet JSON successfully.
- Confirmed `http://127.0.0.1:3000/PM-Productivity-Tool/start-of-day` returns `200 OK`.
- Confirmed PM Supabase lists `public.start_of_day_packets` and `public.start_of_day_items`.
- Confirmed PM Supabase has one 2026-06-15 packet for Dan with 20 items.
Status: Complete

## 2026-06-11 — Architecture cleanup: cockpit hook extraction, brainDumps service, test backfill
Tool: Claude Code (Fable 5)
Branch: refactor/service-tests-and-cockpit-hook
Changes:
- Extracted cockpit snapshot debounce + 4s action polling from App.jsx into `useCockpitSync` hook (App.jsx down ~75 lines).
- Added `brainDumps` service; BrainDumpInbox no longer makes direct supabase `.from('brain_dumps')` calls.
- Backfilled unit tests for all 8 previously untested services (events, todos, mindmaps, whiteboards, workstreams, productivity, landingPageRequests, websiteProject) — 242 new tests including brainDumps.
Verification:
- `npm run lint`: clean. `npm run test -- --run`: 706 passed (49 files, up from 464/40). `npm run build`: succeeds.
Status: Complete

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
