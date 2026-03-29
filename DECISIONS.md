# PM Productivity Tool — Decisions Log

## Architecture

**React 18 + Vite + Tailwind + Supabase**
- SPA with client-side routing
- Supabase for auth, database, and RLS
- Vite for dev server and build (migrated from earlier setup, Jan 2026)
- Tailwind for styling with Neue Haas Grotesk font (internal tooling font, distinct from WP theme)

**Supabase project: dvhjvtxtkmtsqlnurhfg ("Content Hub" on Supabase dashboard)**
- Note: Supabase project name doesn't match tool name (historical naming)

## Confirmed Decisions

**Improve standalone first, then integrate into Unity Hub**
- Confirmed by Dan (2026-03-01). Get the tool working well and adopted before worrying about unification.

**Improvement roadmap status uncertain**
- 47-item roadmap from Jan 2026 — unclear how many items completed. Needs audit before planning next work.

## Pending Decisions

**Cloudflare migration — proceed or superseded?**
- Full migration design exists (docs/plans/2026-01-26)
- Would align stack with Unity Hub (Workers + D1)
- But Unity Hub unification may supersede — if this tool becomes a Unity Hub module, separate migration is wasted effort
- Feature parity matrix shows all Supabase features can be replicated in D1
- Cost savings: ~$25/mo Supabase → ~$10-15/mo Cloudflare

**Component extraction — standalone or wait?**
- Reusable UI components designed (docs/plans/2026-01-19)
- If Unity Hub creates a shared design system, this feeds into it
- If standalone, components could be published as internal package
