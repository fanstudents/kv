---
schema_version: behavior-contract/v1
id: kv.knowledge-base.reindex.compatibility
title: Knowledge Base Reindex Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base reindex selection, orchestration, and legacy search helpers from the route.
  non_goals:
    - Change kb_chunks data formats, embedding, chunking, or index ownership.
    - Change the Knowledge Base UI, response envelopes, or published-document semantics.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Reindex Compatibility

## Behavior Boundary

The rules module selects published documents with non-empty content for a
full reindex. The application module preserves the GET stats read and POST
reindex envelope. The legacy adapter keeps `listKnowledgeDocs`, `indexDocs`,
and `indexStats` behind a provider-neutral port, preserving their current
best-effort and persistence behavior.

## Invariants

1. GET returns `{ stats: { chunks, docs } }` from the existing index helper.
2. POST reads published documents, counts all published rows, indexes only
   rows whose content is non-empty after trimming, and returns
   `{ published, indexable, chunks, stats }`.
3. Existing chunking, embeddings, `kb_chunks` writes, best-effort failure
   behavior, row formats, and `maxDuration = 300` remain unchanged.
4. No Knowledge Base UI, schema, data ownership, or unrelated indexing caller
   changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-reindex-rules.test.ts
    - tests/unit/knowledge-base-reindex-application.test.ts
    - tests/unit/knowledge-base-legacy-reindex-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `selectIndexableKnowledgeDocs`,
  `runKnowledgeBaseReindex`, `runKnowledgeBaseIndexStats`, and
  `createLegacyKnowledgeBaseReindexAdapter` to the reindex GET/POST routes;
  the existing `indexDocs` update/import callers remain in place.
- Full verification at `5d1c92e`: 123 Vitest files / 434 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base reindex boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Reindex selection and orchestration are now independently testable and
  replaceable without changing the route contract.
- Existing indexing, response data, and UI behavior remain unchanged.
