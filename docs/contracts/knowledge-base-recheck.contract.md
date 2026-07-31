---
schema_version: behavior-contract/v1
id: kv.knowledge-base.recheck.compatibility
title: Knowledge Base Recheck Compatibility
status: active
owner_surface: cron-api
change_context:
  type: refactor
  reason: Separate cron authorization, recheck scheduling, and legacy source freshness side effects from the route.
  non_goals:
    - Change URL freshness hashing, source/document rows, review marking, or activity writes.
    - Change the cron endpoint response, schedule limit, or Knowledge Base UI.
    - Add a schema migration, repository cutover, or production scheduler switch.
---

# Knowledge Base Recheck Compatibility

## Behavior Boundary

The rules module owns fail-closed cron authorization. The application module
owns the fixed ten-source recheck schedule and response envelope. The legacy
adapter keeps `recheckUrlSources`, including scrape/hash comparison, source
timestamps, stale-document marking, activity writes, and per-source error
isolation, behind a provider-neutral port. The route retains header access,
HTTP status mapping, and `maxDuration = 300`.

## Invariants

1. Missing or empty `CRON_SECRET` returns HTTP 503 with
   `server misconfigured: CRON_SECRET not set`.
2. A missing or mismatched `x-cron-key` returns HTTP 401 with `unauthorized`.
3. An exact secret match is the only authorized path.
4. Authorized runs call the legacy recheck with limit `10` and preserve
   `{ ok: true, checked, changed }`.
5. URL normalization, content hashing, freshness comparison, `review_at`
   updates, `line_agent_activity` writes, source/document row formats, and
   per-source best-effort error handling remain unchanged.
6. No UI, UI-facing data format, database schema, or migration behavior is
   changed by this boundary.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-recheck-rules.test.ts
    - tests/unit/knowledge-base-recheck-application.test.ts
    - tests/unit/knowledge-base-legacy-recheck-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseRecheckAuth`,
  `runKnowledgeBaseRecheck`, and
  `createLegacyKnowledgeBaseRecheckAdapter` to the cron route;
  `recheckUrlSources` remains behind the adapter.
- Full verification at `aac9964`: 144 Vitest files / 466 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after
  the recheck boundary; the DOM snapshot was exactly unchanged.

## Intentional Changes

- Cron authorization, scheduling, and legacy freshness side effects are now
  independently testable and replaceable.
- Existing recheck behavior, response data, persistence assumptions, and UI
  behavior remain unchanged.
