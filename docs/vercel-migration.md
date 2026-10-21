# Momentum Hub migration to Vercel

Prepared 21 October 2026. Status: migration configuration prepared; release and staff cutover pending.

## Verified existing Vercel project

On 21 October, the signed-in dashboard confirmed `pm-productivity-tool` under `danieldavis-4160s-projects`, connected to `ddpopmatters/PM-Productivity-Tool`. Its production deployment `HoidwTd7PnRpHm4ZbRyUfZJhjBdm` uses revision `89374a2efb17602671d4ee38362dbed5687239b4` and the domain `https://pm-productivity-tool.vercel.app`.

The deployment reports Ready, but its HTML references assets under `/PM-Productivity-Tool/` and the browser renders a blank page. Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured for Production; their values were not revealed. Preview configuration was not shown for these variables.

## Hosting configuration

Keep the GitHub repository `ddpopmatters/PM-Productivity-Tool` and the existing Supabase backend. Only the frontend hosting moves.

The ignored local Vercel metadata links to a project named `pm-productivity-tool`. Verify its owner, Git connection, current deployments and environment settings after signing in before reusing it. This link alone does not establish access or deployed state.

Import or connect that repository with the repository root as the Vercel root directory. `vercel.json` selects Vite, builds into `dist`, forces the root base path and rewrites frontend routes to `index.html`. The explicit build base also sets the router basename and PWA scope/start URL. GitHub Pages retains its existing build path and manual deployment workflow during migration.

Configure these frontend build variables in Vercel through the provider's secure settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the browser-safe anonymous key, never a service-role key)

Use the staging backend for preview deployments, following `staging-contract.md`. Do not point arbitrary PR previews at production by default.

## Before staff cutover

1. Confirm the Vercel account/team and chosen permanent production URL. Inspect any existing deployment before replacing it.
2. Run the existing build, lint and test commands with dependencies installed. Verify that the built asset URLs and PWA manifest use `/`.
3. Deploy a preview with staging configuration. Check the login screen, direct navigation and refresh at `/start-of-day`, static assets, and PWA manifest.
4. Add the final URL to the shared Supabase Auth redirect allowlist. Review the shared project's Site URL before changing it: other applications also use this backend.
5. Update deployed edge-function `APP_URL` settings and verify CORS. Current functions use `APP_URL` directly as an allowed origin, so configure an origin without a trailing slash or path. Review `invite-user`, `delete-invite`, `delete-user`, `send-notification-email`, and `agent-control`.
6. Replace the hard-coded GitHub Pages `redirectTo` in `supabase/functions/invite-user/index.ts` with the confirmed application URL/configuration through the approved function release flow. Updating `APP_URL` alone does not fix that invitation redirect.
7. Verify sign-in, sign-out, password reset, invitation acceptance, admin actions, notifications, task read/write, and Start Of Day files with authorised test accounts. Inspect browser errors and failed requests.
8. Review Telegram Mini App links, cockpit/browser integrations, bookmarks and any other clients that still refer to GitHub Pages. Staff must sign in again on the new origin; browser sessions and installed PWAs do not transfer between origins.
9. Obtain approval for the concrete production release and URL, then deploy/promote and verify the same flows on production before sharing the new address.

No database migration is required for the hosting change. No backend or account changes have been made as part of this preparation.

## Rollback

Keep the existing GitHub Pages site available throughout cutover. Record its current successful workflow run/revision and URL, plus the Vercel deployment ID, before release. If verification fails, keep staff on `https://ddpopmatters.github.io/PM-Productivity-Tool/`, revert any changed backend URL settings and invitation deployment, and retain both auth redirect URLs during recovery. If replacing an existing Vercel deployment, record its deployment ID for rollback as well. Rollback has not yet been exercised.

## Verification and outstanding access

The Vercel browser is authenticated; the CLI has no authenticated session. A local dependency installation failed with `ENOSPC` and its partial `node_modules` directory was removed. Local build, lint and tests could not run. CI now includes a root-hosted production build alongside existing lint and tests. Provider variable presence and existing Vercel deployment state were verified above; live migration verification remains pending. Local configuration is not a release-ready verdict.

Provider reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Follow-up verification on 21 October

- Both public production bundles (GitHub Pages and Vercel) point to `https://jzalaltexmotkusvqoew.supabase.co`. The Supabase CLI identifies this linked project as **Workstream Tool**, `ACTIVE_HEALTHY`. The older Content Hub project referenced in PROJECT.md is `INACTIVE`; do not migrate or configure it for this cutover.
- An OPTIONS request to the active backend's `invite-user` endpoint with `Origin: https://pm-productivity-tool.vercel.app` returned `Access-Control-Allow-Origin: https://ddpopmatters.github.io`. This blocks the invitation browser flow from Vercel and must be corrected before staff cutover.
- PR #14 passed CI: 493 tests across 34 files, lint and root-hosted build. The security job passed its critical threshold but reported 24 existing advisories, including 18 high; a green job does not mean a clean dependency audit. Dependency remediation was not included in this hosting change.
- Vercel built preview deployment `41T68hsN62NHVyqcK2oZQdmATdXH` successfully. Its URL is `https://pm-productivity-tool-git-code-556c94-danieldavis-4160s-projects.vercel.app`; HTTP access redirects to Vercel SSO. Browser smoke testing is pending because the authenticated browser connection became unavailable.
- Production remains unchanged. Release preflight is BLOCKED pending backend origin/redirect fixes, authenticated smoke tests, dependency-risk review and approval of the concrete production release.
