---
schema_version: behavior-contract/v1
id: kv.goals.read.compatibility
title: Goals Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Goals GET data access from the route.
  non_goals:
    - Change agent_goals rows, default seeding, ordering, or schema.
    - Change the Goals UI, local cache, progress calculations, or response shape.
    - Add migrations or replace the existing goals server helper.
---

# Goals Read Compatibility

## Behavior Boundary

The Goals read application invokes a provider-neutral list port. The legacy
adapter keeps the existing `listGoals` helper, including row mapping, creation
ordering, and default-seed behavior, behind that port. The route retains the
`{ goals }` HTTP envelope.

## Invariants

1. GET `/api/goals` invokes the existing `listGoals` behavior unchanged.
2. The response remains `{ goals: AgentGoal[] }` with the same mapped fields,
   ordering, and default data when the `agent_goals` table is empty.
3. Provider exceptions continue to propagate through the existing route/runtime
   behavior; no new fallback or schema assumption is introduced.
4. No Goals UI, local cache, progress calculation, row format, retention rule,
   or schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/goals-read-application.test.ts
    - tests/unit/goals-read-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runGoalsRead`, `GoalsReadPort`, and
  `createLegacyGoalsReadAdapter` through the Goals read modules, adapter, and
  route; `listGoals` remains behind the adapter.
- Full verification at `24ce542`: 96 Vitest files / 396 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Goals GET cutover.

## Intentional Changes

- Goals GET data access is now unit-tested and isolated behind a
  provider-neutral read boundary.
- The existing list helper, default seed behavior, response envelope, UI, and
  data formats stay unchanged.
