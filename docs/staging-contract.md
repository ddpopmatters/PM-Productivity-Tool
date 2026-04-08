# Momentum Hub Staging Contract

## Environment Contract

| Environment | URL | Health | Data source | Secrets owner | Rollback |
| --- | --- | --- | --- | --- | --- |
| Preview | Cloudflare Pages preview URL for the staging project | `/healthz.json` | Staging Supabase project and staging notifications | GitHub repo secrets (`STAGING_*`) + Cloudflare Pages project config | Redeploy the previous preview deployment from Cloudflare Pages |
| Staging | `https://momentum-hub-staging.populationmatters.org` | `/healthz.json` | Staging Supabase project, staging edge functions, staging notification targets | GitHub repo secrets (`STAGING_*`) + Cloudflare Pages project config | Restore the previous successful staging deployment in Cloudflare Pages |
| Production | Existing GitHub Pages URL/custom domain | `/PM-Productivity-Tool/healthz.json` | Production Supabase project and production notification targets | Existing GitHub repository secrets | Restore the previous successful GitHub Pages deployment from the Pages deployment history |

## CI Contract

- Pull requests deploy a Cloudflare Pages preview from the staging project.
- Pushes to `main` promote the latest commit to the persistent staging deployment.
- Production deploys are manual-only through `.github/workflows/deploy.yml`.
- Promotion gate before production:
  - `npm run build`
  - `npm test`
  - Smoke check the staging deployment health endpoint
  - Manual auth, admin, and invite flow verification

## Integration Contract

- Staging must use a separate Supabase project, separate edge-function secrets, and non-production Telegram/webhook targets.
- Outbound notifications are disabled by default in staging unless a staging-only recipient is configured.
- OAuth and auth redirect URIs must point at the staging domain, never the production URL.
- Staging uses `VITE_APP_BASE_PATH=/` so the app can live at the staging domain root without GitHub Pages path assumptions.

## Required Secrets

- `STAGING_VITE_SUPABASE_URL`
- `STAGING_VITE_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CF_PAGES_STAGING_PROJECT`
