---
schema_version: behavior-contract/v1
id: kv.goals.delete.compatibility
title: Goals Delete Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Goals DELETE query validation and persistence from the route.
  non_goals:
    - Change agent_goals delete semantics, row format, or schema.
    - Change the Goals UI, local cache, or response shape.
    - Add migrations or replace the existing goals server helper.
---

# Goals Delete Compatibility

## Behavior Boundary

The rules module owns query-id validation. The application invokes a
provider-neutral delete port. The legacy adapter keeps the existing
`deleteGoal` helper behind that port; the route retains HTTP mapping.

## Invariants

1. DELETE `/api/goals?id=...` requires a non-empty query id. Missing or empty
   id returns HTTP 400 with `{ error: "缺少 id" }` and does not call the
   provider.
2. A valid id is passed unchanged to the existing `deleteGoal` helper.
3. Successful deletion returns `{ ok: true }`.
4. Provider exceptions continue to propagate through the existing route/runtime
   behavior; no new fallback or schema assumption is introduced.
5. No Goals UI, local cache, row format, retention rule, or schema/data behavior
   changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/goals-delete-rules.test.ts
    - tests/unit/goals-delete-application.test.ts
    - tests/unit/goals-delete-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseGoalDeleteRequest`, `runGoalDelete`, and
  `createLegacyGoalDeleteAdapter` through the Goals delete modules, adapter,
  and route; `deleteGoal` remains behind the adapter.
- Full verification at `b3f33ae`: 99 Vitest files / 401 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Goals DELETE cutover.

## Intentional Changes

- Goals DELETE query validation and persistence are now unit-tested and
  isolated behind a provider-neutral application boundary.
- The existing delete helper, success response, UI, and data formats stay
  unchanged.
