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
