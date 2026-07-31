---
schema_version: behavior-contract/v1
id: kv.agent-instance.read.compatibility
title: Agent Instance Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate the Agent instance GET query and response mapping from the dynamic route.
  non_goals:
    - Change Agent catalog definitions, presentation props, or the Agent UI.
    - Change the line_agents row shape, select columns, or PATCH behavior.
    - Add a schema migration, repository cutover, or Agent registry switch.
---

# Agent Instance Read Compatibility

## Behavior Boundary

The application module owns the found/not-found response outcome. The legacy
adapter keeps the existing `line_agents` `select("*")` query and provider
error text behind an Agent instance read port. The dynamic route retains
Next.js params and HTTP response mapping. The existing PATCH path remains
untouched in this boundary.

## Invariants

1. GET queries `line_agents` by the exact `slug` parameter and selects `*`.
2. A provider error or missing row returns HTTP 404 with the provider error
   message when available, otherwise `not found`.
3. A found row is returned unchanged as the JSON response body.
4. Agent catalog definitions, presentation data, UI props, row formats,
   PATCH updates, activity side effects, and `line_agent_activity` remain
   unchanged.
5. No UI, UI-facing data format, database schema, or migration behavior is
   changed by this boundary.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/agent-instance-read-application.test.ts
    - tests/unit/agent-instance-read-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runAgentInstanceRead`,
  `createLegacyAgentInstanceReadAdapter`, and `AgentInstanceReadPort` only
  through the Agent `[slug]` GET route; PATCH remains on its legacy path.
- Full verification at `da248df`: 146 Vitest files / 470 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after
  the Agent instance read boundary; the DOM snapshot was exactly unchanged.

## Intentional Changes

- Agent instance GET querying and response mapping are now independently
  testable and replaceable.
- Existing row data, provider behavior, PATCH implementation, and UI
  behavior remain unchanged.
