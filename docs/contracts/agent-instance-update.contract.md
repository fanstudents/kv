---
schema_version: behavior-contract/v1
id: kv.agent-instance.update.compatibility
title: Agent Instance Update Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Agent instance PATCH input mapping, persistence, and activity side effects from the dynamic route.
  non_goals:
    - Change the line_agents row shape, update columns, activity vocabulary, or Agent UI.
    - Add validation rules beyond the existing boolean/object field filtering.
    - Add a schema migration, repository cutover, or Agent registry switch.
---

# Agent Instance Update Compatibility

## Behavior Boundary

The rules module owns the existing `updated_at` patch construction and the
boolean `enabled`／object `settings` field filtering. The application module
owns the update result mapping and ordered activity side effects. The legacy
adapter keeps the `line_agents` update and `line_agent_activity` inserts
behind a provider-neutral port. The route retains JSON parsing and HTTP
response mapping.

## Invariants

1. Every PATCH constructs an `updated_at` field; only boolean `enabled` and
   truthy object `settings` fields are added.
2. A provider update error records `更新設定失敗：{message}` with status
   `failed`, then returns HTTP 400 with the provider message.
3. A successful boolean update records `Agent 已啟用` or `Agent 已停用`;
   a successful settings update records `已更新 Agent 設定`.
4. When both fields are present, the enabled activity is written before the
   settings activity, matching the existing route order.
5. The update query still targets `line_agents` by exact `slug`, selects the
   updated row, and returns that row unchanged.
6. Existing GET behavior, activity vocabulary, data formats, schema
   assumptions, and UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/agent-instance-update-rules.test.ts
    - tests/unit/agent-instance-update-application.test.ts
    - tests/unit/agent-instance-update-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseAgentInstanceUpdateRequest`,
  `runAgentInstanceUpdate`, `createLegacyAgentInstanceUpdateAdapter`, and
  `AgentInstanceUpdatePort` only through the Agent `[slug]` PATCH route.
- Full verification at `ba40184`: 149 Vitest files / 475 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after
  the Agent instance update boundary; the DOM snapshot was exactly unchanged.

## Intentional Changes

- Agent instance PATCH mapping, persistence access, and activity orchestration
  are now independently testable and replaceable.
- Existing row data, provider behavior, activity wording/order, and UI
  behavior remain unchanged.
