## 2026-04-08 — Ollama LLM integration: Telegram bot + digest
Tool: Claude Code (claude-sonnet-4-6)
Branch: feature/ollama-telegram-llm
Changes:
- relay/server.ts: Deno HTTPS proxy (port 8787) — forwards authenticated /chat requests to Ollama
- supabase/functions/_shared/llm.ts: shared client, gracefully returns null when relay offline
- telegram-bot: natural language task creation (tryParseTaskIntent), smart brain dump routing (suggestBrainDumpRoute), /summary command, pending_data session column
- telegram-digest: LLM focus line prepended to morning digest when overdue/high-priority tasks exist
- Migration 039: adds pending_data JSONB to telegram_sessions
- ~/Library/LaunchAgents/com.pixeloffice.ollama-relay.plist: auto-starts relay on MacBook login
- Permanent tunnel: ollama.uncommongrowth.co.uk via pixel-office named tunnel (ingress added)
- E2E verified: Cloudflare → relay → MacBook Air Ollama (qwen3:4b) → 200 OK
- All 3 Supabase secrets set; both functions deployed; migration 039 applied
Status: Complete

## 2026-04-08 — Deploy-readiness: migration state repair and CRON_SECRET rotation
Tool: Claude Code (claude-sonnet-4-6)
Branch: main
Changes:
- Investigated `032_website_project_v2.sql` / `034_website_project_v2.sql` deletions: version-prefix collision with newer `032_expand_brain_dumps_routed_to_type.sql` / `034_telegram_sessions.sql`; DB already had new ones applied — v2 files correctly removed, deletions were intentional not accidental
- Replaced hardcoded `CRON_SECRET` (`830a33ff…`) in `035_telegram_digest_cron.sql` with `__CRON_SECRET__` placeholder; old secret was in untracked working-tree file only, never committed to git
- Rotated `CRON_SECRET` in Supabase secrets via CLI (`supabase secrets set`)
- Created `038_update_cron_secret.sql` migration; applied to remote DB via `supabase db push --include-all` using patched secret in memory — placeholder restored after push, secret never persisted to repo
- All validation passed: `git diff --check`, `npm ci --dry-run`, `npm audit` (0 vulns), `npm run lint`, `npm run build`, `deno check` (5 edge functions)
- Pre-existing test failures (81): `act(...)` not supported in production React builds — NODE_ENV misconfiguration in test setup, unrelated to this session
Status: Complete

## 2026-04-02 — Repository review for bugs and stale code
Tool: Codex
Branch: main
Changes:
- Ran `npm test`, `npm run build`, and `npm run lint`; all passed, with a Vite chunk-size warning and one dynamic-import chunking warning
- Reviewed the current uncommitted changes across deployment workflows, auth/admin invite flows, Telegram edge functions, and Supabase migrations
- Flagged production and staging coupling in the invite and Telegram cron paths, plus a timezone regression in the Telegram digest callback flow
- Flagged missing RLS on `telegram_sessions` and schema drift from deleted website-project migrations that are still required by the frontend
Status: Complete

## 2026-04-06 — Comprehensive repository audit
Tool: Codex
Branch: main
Changes:
- Ran `npm test`, `npm run lint`, `npm run build`, `npm audit --audit-level=high`, and `deno check` across the Supabase edge functions
- Confirmed the frontend checks pass, but captured build-time warnings for ineffective code-splitting and oversized chunks
- Flagged a broken password-reset callback flow, auth-admin pagination gaps, and Telegram routing logic that assigns non-owner actions to the owner account
- Flagged TypeScript check failures in the Deno edge functions and recorded the current high-severity transitive dependency advisories
Status: Complete

## 2026-04-06 — High-priority fix pass
Tool: Codex
Branch: main
Changes:
- Wired Supabase callback handling back into the SPA so signup, invite, magic-link, and password-reset redirects land in the callback UI instead of falling through to the normal login/app shell
- Updated auth redirect URLs to use the deployed app base path and hardened recovery handling for expired or invalid reset links
- Fixed Telegram routing to use the registered chat user instead of the global owner account, and restricted workstream-task routing to workstreams the chat user can still access
- Added paginated auth-user lookup helpers to the invite/delete edge functions and fixed the Deno typing issues so `deno check` now passes for all reviewed Supabase functions
Status: Complete

## 2026-04-07 — Dependency advisory cleanup
Tool: Codex
Branch: main
Changes:
- Added npm overrides for vulnerable `vite-plugin-pwa` transitives, resolving `lodash` and `serialize-javascript` advisories without removing PWA support
- Updated Vite from 7.3.1 to 7.3.2 to clear the remaining high-severity Vite advisory
- Removed the ineffective dynamic import of `workflowItems`, eliminating the related Vite chunking warning
- Re-ran `npm audit --audit-level=high`, `npm test`, `npm run lint`, `npm run build`, and `deno check`; audit now reports 0 vulnerabilities
Status: Complete

## 2026-04-07 — Dependency cleanup follow-up
Tool: Codex
Branch: main
Changes:
- Re-ran the full `npm audit` and confirmed 0 vulnerabilities across all severities
- Updated `@supabase/supabase-js` from 2.100.1 to 2.101.0 within the existing v2 dependency line
- Confirmed the only remaining `npm outdated` entries are major-version migration candidates rather than in-range security updates
- Re-ran `npm test`, `npm run lint`, `npm run build`, and `deno check`; all passed, with the existing large bundle warning still present
Status: Complete

## 2026-04-07 — Deploy readiness review
Tool: Codex
Branch: main
Changes:
- Classified the dirty worktree and separated recent auth/dependency/function changes from unrelated workflow, admin, logging, and local metadata edits
- Reviewed the production GitHub Pages and staging Cloudflare Pages workflows, including their base-path and secret wiring
- Flagged deployment blockers in the Supabase migration set: tracked website-project migrations are deleted and the Telegram digest cron migration contains a materialised cron secret
- Re-ran `npm ci --dry-run`, `git diff --check`, and used the existing green test/lint/build/Deno checks as validation context
Status: Blocked

## 2026-04-08 — Telegram setup script hardening
Tool: Codex
Branch: main
Changes:
- Updated `setup-telegram.sh` so it no longer prints `CRON_SECRET` values or writes substituted secrets back into repository migration files
- Added guardrails that abort setup when the cron migration already contains a materialised secret or no longer has the `__CRON_SECRET__` placeholder
- Disabled automatic database push from the script unless `SKIP_DB_PUSH=true`, keeping runtime-secret SQL out of normal repo mutation paths
- Ran `bash -n setup-telegram.sh` and targeted secret-pattern checks after the script change
Status: Blocked

## 2026-04-08 — Test environment release gate fix
Tool: Codex
Branch: main
Changes:
- Updated the npm test scripts to force `NODE_ENV=test` before launching Vitest so inherited production shells do not load React production builds
- Reproduced the 81 `act(...)` failures with `NODE_ENV=production npm test` before the fix and confirmed the same command passes afterward
- Re-ran `npm test`, `npm ci --dry-run`, `npm audit --audit-level=high`, `npm run lint`, `npm run build`, and `deno check`; all passed
- Noted the remaining Vite large chunk warning during production build
Status: Complete

## 2026-04-08 — Initial bundle split for website route
Tool: Codex
Branch: main
Changes:
- Moved the website project hook/view behind a lazy `WebsiteRoute` boundary so website code is not pulled into the initial app chunk
- Removed the eager website project load from the app startup path; website data now loads when the website route mounts
- Rebuilt the app and confirmed the main chunk dropped from 594.85 kB to 481.49 kB and the Vite large chunk warning no longer appears
- Re-ran `npm run lint`, `npm test`, and `git diff --check`; all passed
Status: Complete
