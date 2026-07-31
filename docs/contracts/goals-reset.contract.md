---
schema_version: behavior-contract/v1
id: kv.goals.reset.compatibility
title: Goals Reset Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Goals POST reset persistence from the route.
  non_goals:
    - Change DEFAULT_GOALS, reset delete/insert semantics, or schema.
    - Change the Goals UI, local cache, or response shape.
    - Add migrations or replace the existing goals server helper.
---

# Goals Reset Compatibility

## Behavior Boundary

The Goals reset application invokes a provider-neutral reset port. The legacy
adapter keeps the existing `resetGoalsToDefault` helper, including its
delete-all and default-insert behavior, behind that port. The route retains the
`{ goals }` HTTP envelope.

## Invariants

1. POST `/api/goals` invokes the existing `resetGoalsToDefault` behavior
   unchanged.
2. The response remains `{ goals: AgentGoal[] }` with the existing
   `DEFAULT_GOALS` values and field shape.
3. Provider exceptions continue to propagate through the existing route/runtime
   behavior; no new fallback or schema assumption is introduced.
4. No Goals UI, local cache, row format, retention rule, or schema/data behavior
   changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/goals-reset-application.test.ts
    - tests/unit/goals-reset-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runGoalsReset`, `GoalsResetPort`, and
  `createLegacyGoalsResetAdapter` through the Goals reset modules, adapter, and
  route; `resetGoalsToDefault` remains behind the adapter.
- Full verification at `edcd8c9`: 101 Vitest files / 403 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Goals reset cutover.

## Intentional Changes

- Goals reset persistence is now unit-tested and isolated behind a
  provider-neutral application boundary.
- The existing reset helper, default goals, response envelope, UI, and data
  formats stay unchanged.
