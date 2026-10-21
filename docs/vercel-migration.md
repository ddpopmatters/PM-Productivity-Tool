# Momentum Hub migration to Vercel

Updated 21 October 2026. Status: Vercel production deployed; Supabase URLs and five backend functions updated. Signed-in application checks remain pending. Earlier preparation notes below retain the checks and blockers observed before release; the release record supersedes their deployment status.

## Production release record

- Dan explicitly approved merging PR #14, deploying to the existing Vercel project, updating Supabase URLs/functions and running production checks while retaining GitHub Pages.
- PR #14 merged as `e60bd6602d57a795eb6f9c73896f202a766d95c2`. Vercel production deployment `DdpF6Fz6wEubzdwjovdnrJvYYyB2` completed successfully at `https://pm-productivity-tool.vercel.app`.
- Supabase Site URL is now `https://pm-productivity-tool.vercel.app`. The exact redirect `https://pm-productivity-tool.vercel.app/` was added alongside the existing GitHub Pages redirect.
- Added `MOMENTUM_APP_URL=https://pm-productivity-tool.vercel.app`; the existing `APP_URL` was not changed.
- Released the minimal live-source patches for `invite-user`, `delete-invite`, `delete-user`, `send-notification-email`, and `agent-control`. Function versions after the configuration update and deployment are 21, 18, 17, 22 and 10 respectively. Existing JWT verification settings were preserved.
- Production HTTP checks passed for `/`, `/start-of-day`, the main JavaScript bundle, `/manifest.webmanifest`, `/favicon.svg` and `/healthz.json`. PWA scope/start URL are `/`. The bundle uses the same active Workstream Tool backend as GitHub Pages.
- All five functions allow both production and GitHub Pages origins, exclude the tested lookalike origin, and return HTTP 401 to unauthenticated POST requests. These checks do not send invitations, notifications or delete requests with valid credentials.
- GitHub Pages still returns HTTP 200 and its deployment workflow was not changed or dispatched.
- A remaining hard-coded favicon link was found during production checks; the release follow-up changes it to Vite's `%BASE_URL%` placeholder for both hosting paths.
- Signed-in read/write flows, invitation acceptance, password-reset delivery and outbound notifications are not yet verified. Existing dependency advisories remain documented below.
- Local release evidence, exact rollback function sources, candidate bundles and HTTP check results are under `.vercel/migration-2026-10-21/` (ignored by Git).

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
5. Deploy the prepared URL changes for `invite-user`, `delete-invite`, `delete-user`, `send-notification-email`, and `agent-control`. Set `MOMENTUM_APP_URL=https://pm-productivity-tool.vercel.app` on the active Workstream Tool backend. The dedicated override takes priority over the existing `APP_URL`, which remains untouched for rollback. The prepared functions compare exact URL origins and retain GitHub Pages as an allowed origin.
6. The invitation redirect now follows the selected application URL rather than a hard-coded GitHub Pages link. Release the minimal patch against the downloaded live source, preserving the existing live account logic, and verify it through the approved function release flow.
7. Verify sign-in, sign-out, password reset, invitation acceptance, admin actions, notifications, task read/write, and Start Of Day files with authorised test accounts. Inspect browser errors and failed requests.
8. Review Telegram Mini App links, cockpit/browser integrations, bookmarks and any other clients that still refer to GitHub Pages. Staff must sign in again on the new origin; browser sessions and installed PWAs do not transfer between origins.
9. Obtain approval for the concrete production release and URL, then deploy/promote and verify the same flows on production before sharing the new address.

No database migration is required for the hosting change. No backend or account changes have been made as part of this preparation.

## Rollback

Keep the existing GitHub Pages site available throughout cutover. Record its current successful workflow run/revision and URL, plus the Vercel deployment ID, before release. If verification fails, keep staff on `https://ddpopmatters.github.io/PM-Productivity-Tool/`, restore the downloaded edge-function sources, unset the newly added `MOMENTUM_APP_URL`, restore the previous Supabase Site URL and retain both auth redirect URLs during recovery. The original `APP_URL` is not changed. If replacing an existing Vercel deployment, record its deployment ID for rollback as well. Rollback has not yet been exercised.

## Verification and outstanding access

The Vercel browser is authenticated; the CLI has no authenticated session. A local dependency installation failed with `ENOSPC` and its partial `node_modules` directory was removed. Local build, lint and tests could not run. CI now includes a root-hosted production build alongside existing lint and tests. Provider variable presence and existing Vercel deployment state were verified above; live migration verification remains pending. Local configuration is not a release-ready verdict.

Provider reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Follow-up verification on 21 October

- Both public production bundles (GitHub Pages and Vercel) point to `https://jzalaltexmotkusvqoew.supabase.co`. The Supabase CLI identifies this linked project as **Workstream Tool**, `ACTIVE_HEALTHY`. The older Content Hub project referenced in PROJECT.md is `INACTIVE`; do not migrate or configure it for this cutover.
- An OPTIONS request to the active backend's `invite-user` endpoint with `Origin: https://pm-productivity-tool.vercel.app` returned `Access-Control-Allow-Origin: https://ddpopmatters.github.io`. This blocks the invitation browser flow from Vercel and must be corrected before staff cutover.
- PR #14 passed CI: 493 tests across 34 files, lint and root-hosted build. The security job passed its critical threshold but reported 24 existing advisories, including 18 high; a green job does not mean a clean dependency audit. Dependency remediation was not included in this hosting change.
- Vercel built preview deployment `41T68hsN62NHVyqcK2oZQdmATdXH` successfully. Its URL is `https://pm-productivity-tool-git-code-556c94-danieldavis-4160s-projects.vercel.app`; HTTP access redirects to Vercel SSO. Browser smoke testing is pending because the authenticated browser connection became unavailable.
- Production remains unchanged. Release preflight is BLOCKED pending backend origin/redirect fixes, authenticated smoke tests, dependency-risk review and approval of the concrete production release.

## Prepared backend release and further checks

- Signed-in Supabase confirms Site URL `https://ddpopmatters.github.io/PM-Productivity-Tool` and the same single allowlisted redirect URL. Prepare Site URL `https://pm-productivity-tool.vercel.app` and add the exact redirect `https://pm-productivity-tool.vercel.app/`, retaining the existing GitHub Pages redirect. Saving these authentication settings requires action-time approval.
- The dedicated `MOMENTUM_APP_URL` setting is not currently present. Its addition and removal are reversible without retrieving or overwriting the existing `APP_URL` value.
- Downloaded live sources and prepared minimal release candidates are retained locally under `.vercel/migration-2026-10-21/{rollback,candidate}/supabase/functions/`. Local tracked invitation/delete implementations differ from deployed account logic, so deploy the minimal candidate bundles for this hosting migration, not an incidental account-logic update.
- `node .vercel/migration-2026-10-21/verify.mjs` passed 120 offline assertions against the five candidate handlers. OPTIONS requests allow GitHub Pages, allow the configured Vercel origin (including URL settings with a trailing slash/path), and reject a lookalike hostname. Dependencies are stubbed to prevent network requests or email sends.
- Local dependencies now install successfully. `npm run lint`, `VITE_APP_BASE_PATH=/ npm run build`, and `npm test` passed; the local checkout ran 722 tests across 53 files. CI at the earlier head ran 493 tests across 34 files. These are different test inventories, not evidence that CI ran all local files.
- Authenticated Vercel preview access now works at `/start-of-day` and renders the login screen. Its console reports missing Supabase configuration because variables are Production-only; no authenticated application flows have been verified in preview.
- `npm audit --omit=dev` reports three affected production packages: `react-router`, `react-router-dom`, and `ws`, with no critical advisories. Framework/server advisories do not establish exploitability in this static BrowserRouter application; the manifest DoS advisory explicitly excludes Declarative Mode. Dependency remediation remains separate from this hosting change. Sources: [React Router manifest advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-chx6-hx7r-mcp5), [untrusted navigation advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6), [ws advisory](https://github.com/websockets/ws/security/advisories/GHSA-58qx-3vcg-4xpx).
- Review pass: the tracked diff changes URL selection, exact-origin CORS and the invitation redirect only; existing authentication, role checks, rate limits and JWT verification settings are preserved. No migration files, dependency manifests or lock files changed.
