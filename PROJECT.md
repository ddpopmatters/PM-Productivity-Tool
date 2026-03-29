# PM Productivity Tool

## Brief
Internal productivity and workflow tool for PM staff. Separate from Content Hub — focused on broader team productivity rather than content-specific workflows.

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
