---
schema_version: behavior-contract/v1
id: kv.integrations.status.compatibility
title: Integration Status Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate the integration-status route from the legacy aggregator.
  non_goals:
    - Change provider probes, environment-variable names, cache duration, or status keys.
    - Change integration UI, response shape, or provider/data formats.
    - Add a provider migration or a new external integration.
---

# Integration Status Compatibility

## Behavior Boundary

The integrations status module exposes a provider-neutral read port and
application boundary. The legacy adapter keeps `getIntegrationStatus`,
including Google probing, environment checks, the 60-second cache, and the
existing status map. The route remains responsible only for the HTTP JSON
boundary.

## Invariants

1. `GET /api/integrations/status` returns the existing
   `IntegrationStatusMap` keyed by the same integration ids.
2. Each entry preserves `connected` and optional `detail` values exactly as
   produced by the legacy helper.
3. Google account probing and all environment-variable checks retain their
   existing fallback behavior.
4. The existing 60-second cache remains owned by the legacy helper.
5. No Integrations, Agent, Universe, or Connection Status UI changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/integrations-status-application.test.ts
    - tests/unit/integrations-status-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runIntegrationStatus` and
  `createLegacyIntegrationStatusAdapter` to the single status route caller;
  the legacy aggregator remains behind the adapter.
- Full verification at `f89265d`: 108 Vitest files / 413 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  integration-status boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- The route no longer imports the legacy aggregator directly; its only
  dependency is the application boundary plus legacy adapter.
- Provider probes, cache ownership, response data, and UI behavior remain
  unchanged.
