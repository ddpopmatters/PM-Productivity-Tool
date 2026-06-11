---
id: pm-productivity-tool
display_name: Momentum Hub
workspace_path: apps/momentum-hub
repo_root: apps/momentum-hub
category: tool
status: live
owner: Dan Davis
team: Population Matters
aliases:
  - PM Productivity Tool
  - Momentum Hub
  - productivity tool
  - PM workflow tool
package_names:
  - momentum-hub
stack:
  - React 18
  - Vite 7
  - Tailwind CSS
  - Supabase
deploy_targets:
  - GitHub Pages
  - Static hosting
data_stores:
  - Supabase Postgres
  - Supabase Auth
shared_services:
  - GitHub
  - Supabase shared project
key_commands:
  - npm run dev
  - npm run build
  - npm run lint
  - npm run test
key_paths:
  - apps/momentum-hub/src
  - apps/momentum-hub/supabase
  - apps/momentum-hub/docs
dangerous_paths:
  - apps/momentum-hub/supabase/migrations
  - apps/momentum-hub/supabase/functions
depends_on:
  - service:Supabase shared project
dont_confuse_with:
  - content-hub|Separate comms/content operations tool.
  - pm-hermes-cockpit|Dan-only local cockpit for PM Hermes and personal PM context switching.
agent_notes:
  - Broader staff productivity app, not Dan's private Hermes cockpit.
  - Do not touch Supabase migrations directly.
  - Existing tests use Vitest.
  - The PM Hermes Cockpit bridge may publish authenticated read snapshots and apply approved local archive/complete quick actions through Dan's signed-in browser session.
---

# Momentum Hub

## Brief
Internal productivity and workflow tool for PM staff. Formerly listed in the workspace as PM Productivity Tool. Separate from Content Hub — focused on broader team productivity rather than content-specific workflows.

## Goals
- Streamline internal workflows across PM
- Provide team with shared productivity tools
- Reduce reliance on scattered spreadsheets and docs

## Audience
- All PM staff (18 people, fully distributed)

## Status
Live / maintaining.

## Scope
**In:** Internal team tooling, productivity features.

**Out:** Content planning (that's Content Hub), public-facing anything.

## Technical Decisions
- **Stack:** React 18 + Vite 7 + Tailwind CSS
- **Backend:** Supabase
- **Font:** Neue Haas Grotesk (internal tooling font, distinct from website)
- **CI:** GitHub Actions (claude-review.yml — currently blocked by Anthropic OAuth bug)
- **Repo:** github.com/ddpopmatters/PM-Productivity-Tool
- **Tests:** 213 tests, Vitest

## Open Questions
- What's the relationship between this and Content Hub? Any feature overlap?
- Is this the right long-term home for non-content productivity features, or should they migrate to Unity Hub?

## Dependencies
- Supabase project: "Content Hub" (dvhjvtxtkmtsqlnurhfg)
