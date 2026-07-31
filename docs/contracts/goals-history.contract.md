---
schema_version: behavior-contract/v1
id: kv.goals.history.compatibility
title: Goals History Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Goals trend request coercion and legacy metric reader access from the route.
  non_goals:
    - Change metric_snapshots rows, snapshot writes, or retention policy.
    - Change GoalTrend UI, frontend cache behavior, or response shape.
    - Add schema migrations or replace the existing metricHistory helper.
---

# Goals History Compatibility

## Behavior Boundary

The rules module owns metric-id presence and days-window coercion. The
application module maps missing metrics to the existing 400 response and
delegates valid reads through a port. The legacy adapter keeps the existing
`metricHistory` helper, including its Supabase query and empty-list fallback.
The route remains responsible only for query extraction and HTTP mapping.

## Invariants

1. A missing or empty `metricId` returns HTTP 400 with `{ error: "缺少 metricId" }`.
2. `days` remains `Math.min(180, Math.max(7, Number(value) || 30))`, including
   the default for null or invalid values.
3. Valid reads call `metricHistory(metricId, days)` and return
   `{ points: ... }` unchanged; the helper's provider failure fallback remains
   an empty list.
4. No GoalTrend UI, `metric_snapshots` row/write/retention, or schema/data
   behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/goals-history-rules.test.ts
    - tests/unit/goals-history-application.test.ts
    - tests/unit/goals-history-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the Goals history rules, application, port, adapter, and route
  as a single boundary; `metricHistory` remains behind the legacy adapter.
- Full verification at `75501b2` plus this checkpoint: 73 Vitest files / 360
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Goals history route cutover.

## Intentional Changes

- Goals trend request coercion and route mapping are now unit-tested and
  provider-neutral.
- Existing metric-history query, fallback, frontend cache, UI, and data formats
  stay unchanged.
