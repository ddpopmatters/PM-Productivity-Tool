## 2026-10-21 — Prepare Vercel hosting migration
Tool: Codex
Changes:
- Added Vercel configuration for a root-hosted Vite build and SPA deep links.
- Added a root-hosted build check to the existing GitHub CI workflow.
- Documented provider setup, Supabase redirect/CORS and invitation dependencies, verification, staff cutover and rollback in docs/vercel-migration.md.
- Rotated June entries into devlog/2026-06.md.
Verification:
- Parsed vercel.json and checked the framework, build command, output directory and SPA rewrite.
- Reviewed configuration against the existing router, auth redirect helper and PWA base path.
- Verified signed-in Vercel project ownership, Git connection, production revision/domain and required variable names without revealing values.
- Confirmed the existing deployment renders blank with GitHub Pages asset paths.
- Local dependency installation failed with ENOSPC; removed the partial install. Build, lint and tests require remote CI verification.
- PR #14 passed remote lint, root-hosted build and all 493 tests; Vercel created a successful protected preview.
- Security CI passed its critical threshold, but audit reports 24 existing advisories including 18 high.
- Verified both production hosts use the same active Workstream Tool backend; its invitation endpoint currently rejects the Vercel origin via CORS.
Status: PR prepared and checks passed; staff cutover blocked by backend configuration and pending authenticated smoke tests. No production changes.

## 2026-10-21 — Prepare reversible Supabase URL cutover
Tool: Codex
Changes:
- Prepared a dedicated MOMENTUM_APP_URL override for five edge functions, exact-origin CORS and configuration-based invitation redirects.
- Downloaded deployed function sources for rollback and prepared minimal release candidates that preserve existing live account logic.
- Documented current Supabase auth URLs, scoped configuration rollback and remaining release gates.
Verification:
- Local lint, root-hosted build and all 722 local tests passed after disk space became available.
- Five release-candidate handlers passed 120 offline CORS assertions without network calls or email sends.
- Vercel preview renders the login screen on a direct /start-of-day request; preview auth remains unconfigured.
- Reviewed the diff for preserved authentication, role checks, rate limits and JWT settings.
Status: Prepared for production approval; no production settings, functions or deployments changed.
