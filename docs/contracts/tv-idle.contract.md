---
schema_version: behavior-contract/v1
id: kv.tv.idle.compatibility
title: TV Idle API Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate TV idle query selection, cache, aggregation, and legacy provider access from the route.
  non_goals:
    - Change the TV page, idle scene, query values, response envelopes, or cache policy.
    - Change line_agent_activity, contacts, calendar, or tag data formats.
    - Add a provider migration, schema migration, or live-task redesign.
---

# TV Idle API Compatibility

## Behavior Boundary

The rules module owns supported `agent` query values. The application module
owns the schedule cache, Visit tag result, and Teamlead activity aggregation.
The legacy adapter keeps Google Calendar, contact tags, Supabase activity
projection/filter/order/limit, and provider clients behind one port. The route
retains JSON envelope and catch-all error mapping.

## Invariants

1. `agent=schedule` reads `listWeekOverview()` and returns `{ ok: true,
   data }`; repeated reads within ten minutes return the same data with
   `cached: true`.
2. `agent=visit` calls `getAvailableTags` and returns `{ ok: true, data: {
   tags } }` unchanged.
3. `agent=teamlead` still reads `line_agent_activity` selecting
   `agent_slug,status,occurred_at`, filters the last 24 hours, orders
   `occurred_at` descending, limits to 500, and returns total/failed/top-three
   aggregation with the existing tie/order behavior.
4. Missing or unsupported agent values return HTTP 400 with `{ ok: false,
   error: "unknown agent" }`.
5. Provider failures retain the catch-all `{ ok: false, data: null }` response
   without changing status.
6. Existing TV consumers, provider arguments, side effects, row formats,
   schema assumptions, and UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/tv-idle-rules.test.ts
    - tests/unit/tv-idle-application.test.ts
    - tests/unit/tv-idle-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseTvIdleAgent`, `createTvIdleApplication`,
  `createLegacyTvIdleAdapter`, and `TvIdlePort` to the TV idle route; the
  application has no direct provider imports.
- Full verification at `6e8b9e1`: 171 Vitest files / 523 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  TV idle boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- TV idle query selection, cache state, provider port, and Teamlead aggregation
  are now independently testable and replaceable.
- Existing query semantics, data/response envelopes, cache TTL, fallback/error
  behavior, schema assumptions, and UI behavior remain unchanged.
