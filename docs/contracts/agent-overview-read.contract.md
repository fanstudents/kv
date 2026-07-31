---
schema_version: behavior-contract/v1
id: kv.agent-overview.read.compatibility
title: Agent Overview Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate four Agent overview routes from shared read orchestration and provider-specific legacy helpers.
  non_goals:
    - Change Search Console, GA4, teaching-system, or Google Calendar payloads.
    - Change the Agent overview UI, response envelope, or error statuses.
    - Add a provider migration, cross-project repository cutover, or schema change.
---

# Agent Overview Read Compatibility

## Behavior Boundary

The rules module owns the existing `days` query normalization. The shared
application module owns provider result/error mapping. Legacy adapters keep the
existing Search Console, GA4, teaching-system, and Google Calendar helpers
behind a typed read port. Routes retain query access and HTTP response mapping.

## Invariants

1. SEO and traffic routes use `Number(rawDays) || 7`, so missing, empty,
   non-numeric, and zero values remain `7`; non-zero numeric values, including
   negative values, pass through unchanged.
2. SEO delegates to `getSearchOverview(days)` and traffic delegates to
   `getTrafficOverview(days)`.
3. Operations pipeline delegates to `getPipelineOverview()` and schedule
   week-overview delegates to `listWeekOverview()` without changing their
   provider arguments.
4. Successful reads return `{ ok: true, data }` with the provider payload
   unchanged.
5. Provider `Error` instances return `{ ok: false, error: message }` with HTTP
   502; non-Error failures retain the fallback `讀取失敗`.
6. Provider response shapes, cross-project read-only behavior, API access
   behavior, schema assumptions, and Agent UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/agent-overview-rules.test.ts
    - tests/unit/agent-overview-application.test.ts
    - tests/unit/agent-overview-legacy-adapters.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseAgentOverviewDays` to the SEO/traffic routes and
  `runAgentOverview` to all four routes; each legacy provider adapter has one
  route consumer.
- Full verification at `4a81bd8`: 155 Vitest files / 487 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  overview boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Query normalization, shared read/error mapping, and provider access are now
  independently testable and replaceable across four overview surfaces.
- Existing provider payloads, day semantics, status codes, persistence
  assumptions, and UI behavior remain unchanged.
