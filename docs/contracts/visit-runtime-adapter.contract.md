---
schema_version: behavior-contract/v1
id: kv.visit.runtime-adapter.compatibility
title: Visit Runtime Tracking Adapter Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Put the existing Visit run/live-task/artifact facade behind an explicit port for webhook orchestration.
  non_goals:
    - Change run ids, idempotency keys, live-task rows, step projections, artifact rows, or status mapping.
    - Change any LINE handler, provider, persistence, reply, or UI behavior.
    - Change the existing runtime facade implementation or introduce a schema migration.
---

# Visit Runtime Tracking Adapter Compatibility

## Behavior Boundary

`VisitRuntimePort` describes the existing `startVisitRun`, `reportVisitStep`,
`endVisitRun`, and `saveVisitArtifact` contract. `legacy-runtime-adapter.ts`
binds that port to `src/lib/visit-run.ts`. The LINE route keeps the same calls,
arguments, ordering, and handler-level orchestration while no longer importing
the legacy runtime facade directly.

## Invariants

1. `startVisitRun` still receives the same user id, message id, and summary,
   preserving the `line-card:<messageId>` idempotency behavior in the facade.
2. `reportVisitStep` still receives the same node ids, legacy step numbers,
   live statuses, captions, images, details, and sequence values.
3. `endVisitRun` still receives the same success/cancelled/failed vocabulary,
   summaries, and optional error detail.
4. `saveVisitArtifact` still receives the same user id, title, content, kind,
   and metadata and uses the same runtime facade.
5. Existing live-task/run/artifact persistence, status mapping, failure
   behavior, handler order, data formats, and UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-runtime-legacy-adapter.test.ts
    - tests/unit/visit-line-webhook-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the runtime facade consumers through the new adapter and the
  LINE webhook route; the route no longer imports `src/lib/visit-run` directly.
- Full verification at `e6a530d`: 178 Vitest files / 533 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  runtime adapter boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Visit runtime tracking now has an explicit injectable port/legacy adapter;
  the existing facade remains the compatibility implementation.
- Runtime implementation replacement, schema migration, reconciliation, and
  production traffic evidence remain deferred.
