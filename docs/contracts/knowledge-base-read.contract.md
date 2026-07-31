---
schema_version: behavior-contract/v1
id: kv.knowledge-base.read.compatibility
title: Knowledge Base Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base GET filtering and aggregation from the route.
  non_goals:
    - Change knowledge_base or knowledge_access row formats, defaults, or ordering.
    - Change the Knowledge Base UI, response envelope, or status filters.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Read Compatibility

## Behavior Boundary

The rules module normalizes the existing `status` and `sourceDocId` query
filters. The application module loads documents and Agent access in parallel
through a provider-neutral port. The legacy adapter keeps
`listKnowledgeDocs` and `listAgentAccess`, including row mapping, ordering,
default Agent access, and existing provider behavior.

## Invariants

1. `GET /api/knowledge-base` returns `{ docs, access }`.
2. `draft`, `published`, and `archived` remain the only recognized status
   filters; unsupported status values are ignored.
3. `sourceDocId` is passed through unchanged; empty values retain the helper's
   existing no-filter behavior.
4. Document ordering, row mapping, and Agent access defaults remain unchanged.
5. No Knowledge Base, Universe, Agent, or Connection Status UI changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-read-rules.test.ts
    - tests/unit/knowledge-base-read-application.test.ts
    - tests/unit/knowledge-base-legacy-read-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseReadQuery`, `runKnowledgeBaseRead`, and
  `createLegacyKnowledgeBaseReadAdapter` to the Knowledge Base GET route;
  other `listKnowledgeDocs` callers remain on the legacy helper.
- Full verification at `13fe0c2`: 111 Vitest files / 417 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base read boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- GET query normalization and the `{ docs, access }` aggregation are now
  independently testable.
- The existing helpers, row formats, default access, ordering, and UI remain
  unchanged.
