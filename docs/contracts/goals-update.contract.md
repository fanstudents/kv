---
schema_version: behavior-contract/v1
id: kv.goals.update.compatibility
title: Goals Update Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Goals PUT validation and persistence from the route.
  non_goals:
    - Change agent_goals rows, upsert semantics, or schema.
    - Change the Goals UI, local cache, progress calculations, or response shape.
    - Add migrations or replace the existing goals server helper.
---

# Goals Update Compatibility

## Behavior Boundary

The rules module owns catalog validation, coercion, and `AgentGoal` assembly.
The application owns provider invocation and error mapping. The legacy adapter
keeps the existing `upsertGoal` helper behind a goal-update port.

## Invariants

1. Invalid JSON, `null`, and primitive bodies are treated as empty objects.
   `id` is trimmed; `agentSlug` must be in the Agent catalog; `metricId` must
   be in the metric catalog; cadence remains one of `once`, `weekly`,
   `monthly`, or `quarterly`.
2. Validation messages remain `缺少 id`, `agentSlug 不合法`, `找不到這個指標`,
   `cadence 不合法`, and `缺少期限`, each returned as HTTP 400 without a
   provider call.
3. Goal construction preserves numeric `Number(value) || 0` coercion, the
   current-date fallback for `startDate`, string conversion for dates, trimmed
   optional notes, and the existing `AgentGoal` shape.
4. Valid input invokes `upsertGoal(goal)`. Success returns `{ goal }`; provider
   failures continue to return HTTP 500 with the existing error-message
   fallback.
5. No Goals UI, local cache, progress calculation, row format, retention rule,
   or schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/goals-update-rules.test.ts
    - tests/unit/goals-update-application.test.ts
    - tests/unit/goals-update-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseGoalUpdateRequest`, `runGoalUpdate`, and
  `createLegacyGoalUpdateAdapter` through the Goals update modules, adapter,
  and route; `upsertGoal` remains behind the adapter.
- Full verification at `8c12d78`: 94 Vitest files / 394 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Goals PUT cutover.

## Intentional Changes

- Goals PUT validation and persistence are now unit-tested and isolated behind
  a provider-neutral application boundary.
- The existing goal shape, upsert helper, success response, HTTP error mapping,
  UI, and data formats stay unchanged.
