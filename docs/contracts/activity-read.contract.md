---
schema_version: behavior-contract/v1
id: kv.activity.read.compatibility
title: Activity Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate line-agent activity query coercion and storage access from the route.
  non_goals:
    - Change line_agent_activity rows, retention, or write owners.
    - Change dashboard activity consumers or response data shape.
    - Add schema migrations or alter Supabase query semantics.
---

# Activity Read Compatibility

## Behavior Boundary

The rules module owns status and limit coercion. The application module maps the
legacy query error to a typed outcome while returning raw activity data. The
legacy adapter keeps the existing `line_agent_activity` query behind a read
port. The route remains responsible only for query extraction and HTTP status
mapping.

## Invariants

1. `status` is read as an optional string; an empty string does not add a
   filter. `limit` uses the existing `Number(value ?? "200")` coercion,
   including `NaN` for invalid input.
2. The query remains `select("*")`, ordered by `occurred_at` descending, with
   the coerced limit; a truthy status adds `.eq("status", status)`.
3. Query errors return HTTP 400 with `{ error: message }`; successful responses
   return the raw data value unchanged.
4. No UI, write path, row/retention policy, or schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/activity-read-rules.test.ts
    - tests/unit/activity-read-application.test.ts
    - tests/unit/activity-read-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the activity rules, application, port, adapter, and route as a
  single boundary; `getSupabase` remains behind the legacy adapter.
- Full verification at `9925600` plus this checkpoint: 70 Vitest files / 353
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  activity route cutover.

## Intentional Changes

- Activity query coercion and error mapping are now unit-tested and
  provider-neutral.
- Existing Supabase query shape, raw response rows, dashboard behavior, and
  activity data formats stay unchanged.
