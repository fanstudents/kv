---
schema_version: behavior-contract/v1
id: kv.agent.status.read.compatibility
title: Agent Status Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Agent status policy and legacy line_agents access from the route.
  non_goals:
    - Change the AGENTS registry, line_agents rows, Agent PATCH behavior, or schema.
    - Change Sidebar, Dashboard, TV, or other status consumers.
    - Add migrations or introduce a second Agent registry.
---

# Agent Status Read Compatibility

## Behavior Boundary

The rules module owns the deterministic merge between the static `AGENTS`
catalog and database rows. The application owns provider-failure fallback. The
legacy adapter keeps the existing `line_agents` query behind a read port, and
the route returns the same `{ enabled }` response.

## Invariants

1. The adapter reads `line_agents` with `select("slug,enabled")` and does not
   add filters or ordering.
2. A row's `enabled` value is coerced with `Boolean` and overrides the static
   catalog value for the same slug; unknown database slugs remain in the map.
3. A provider error or thrown provider call falls back to `AGENTS[].status ===
   "active"` for every catalog slug.
4. The route returns `{ enabled }` unchanged; Sidebar, Dashboard, TV, other
   status consumers, registry data, and schema behavior are untouched.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/agent-status-rules.test.ts
    - tests/unit/agent-status-application.test.ts
    - tests/unit/agent-status-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `buildAgentStatusMap`, `runAgentStatusRead`, and
  `createLegacyAgentStatusReadAdapter` through the Agents module, adapter, and
  `/api/agents` route; existing `AGENTS` and `line_agents` owners remain
  explicit.
- Full verification at `698ffd0`: 82 Vitest files / 374 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Agent status route cutover.

## Intentional Changes

- Agent status merge and provider fallback are now unit-tested and isolated
  behind a provider-neutral application boundary.
- The existing static fallback, database override, response shape, consumers,
  and data formats stay unchanged.
