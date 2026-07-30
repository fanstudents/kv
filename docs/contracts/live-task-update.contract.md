---
schema_version: behavior-contract/v1
id: kv.live-task.update.compatibility
title: Live Task Update Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Live Task update payload coercion and state-write orchestration from the route.
  non_goals:
    - Change agent_live_task columns, TTL, or state ownership.
    - Change TV, Visit, LINE, or cron consumers.
    - Add schema migrations or change the persisted row format.
---

# Live Task Update Compatibility

## Behavior Boundary

The rules module owns the existing POST payload coercion. The application
module validates the required agent slug and delegates the state patch through
an explicit port. The legacy adapter keeps the existing `setLiveTask` helper,
while the route remains responsible for JSON parsing and HTTP mapping.

## Invariants

1. POST `/api/live-task` still accepts the existing JSON shape and coerces a
   missing or non-string `agent` to an empty slug.
2. A missing agent returns HTTP 400 with `{ "error": "missing agent" }`;
   otherwise the route returns `{ "ok": true }` after the state write resolves.
3. `step` remains numeric when supplied and defaults to `0`; `status` accepts
   only `active`, `waiting`, or `done` and otherwise defaults to `active`.
   String `caption` and `image` values are preserved without trimming.
4. No UI, `agent_live_task` row/schema, TTL, state-store ownership, or shared
   consumer behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/live-task-update-rules.test.ts
    - tests/unit/live-task-update-application.test.ts
    - tests/unit/live-task-update-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the update rules, application, port, adapter, and route as a
  single boundary; `setLiveTask` remains shared with existing Visit, LINE, and
  cron callers.
- Full verification at `6dda162` plus this checkpoint: 61 Vitest files / 335
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  update-route cutover.

## Intentional Changes

- Live Task update coercion and state-write orchestration are now unit-tested
  and provider-neutral.
- The existing Supabase-backed state writer, row format, TTL, and all shared
  consumers stay unchanged.
