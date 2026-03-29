# PM Productivity Tool — Backlog

**Last updated:** 2026-03-01
**Source:** Consolidated from docs/plans/ (9 design documents, Jan 2026)

## Improvement Roadmap (47 items)
From 2026-01-22 roadmap. 6 categories, phased approach.

### Phase 1: Foundation (5 items, ~5 hours)
- [ ] Error boundaries — prevent single component crashes from killing the app
- [ ] Workstream task deletion
- [ ] Remove console.log statements (use Logger)
- [ ] Input validation for long text
- [ ] General stability fixes

### Phase 2: Performance (4 items, ~2 days)
- [ ] Memoize handler callbacks (useCallback)
- [ ] Virtualised list rendering for 200+ items
- [ ] Lazy-loaded route chunks
- [ ] General render optimisation

### Phase 3: Mobile & Accessibility (3 items, ~3 days)
- [ ] Fix mobile responsive issues (filter dropdowns, dashboard layout)
- [ ] WCAG compliance pass
- [ ] Touch-friendly interactions

### Phase 4: Features (4 items, ~2-3 weeks)
- [ ] Real-time notifications (Supabase realtime)
- [ ] Recurring tasks
- [ ] Analytics dashboard enhancements
- [ ] Advanced filtering/search

### Phase 5: Polish (4 items, ~2 weeks)
- [ ] Dark mode (ThemeContext)
- [ ] PWA support
- [ ] Keyboard shortcuts
- [ ] Professional visual finish

## Cloudflare Migration (documented, not started)
Full design at docs/plans/2026-01-26-cloudflare-migration-design.md. Feature parity matrix at docs/plans/2026-01-26-feature-parity-matrix.md. Migration would move from Supabase to Cloudflare Workers + D1 to align with Unity Hub stack.

**Decision needed:** Does this migration happen, or does Unity Hub unification supersede it?

## Component Extraction
Design at docs/plans/2026-01-19-component-extraction-design.md. Extract reusable UI components for sharing across PM tools.

**Decision needed:** Worth doing standalone, or wait for Unity Hub shared component library?

## Dashboard At-a-Glance
Design at docs/plans/2026-01-12-dashboard-at-a-glance.md. Transform dashboard from navigation menu into actionable widget view (7 widgets: pipeline, stats, approvals, deadlines, asset mix, engagement, quick actions).
