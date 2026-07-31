---
schema_version: behavior-contract/v1
id: kv.knowledge-base.import-read.compatibility
title: Knowledge Base Import Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base import source/draft query parsing and reads from the route.
  non_goals:
    - Change PDF conversion, AI extraction, review, publish, or discard behavior.
    - Change kb_sources/knowledge_base row formats, response envelopes, or UI.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Import Read Compatibility

## Behavior Boundary

The rules module preserves the existing `sourceId` branch: absent or empty
values list imported sources, while a provided value lists draft documents
for that source. The application module keeps the two response envelopes. The
legacy adapter keeps `listKbSources` and draft-filtered `listKnowledgeDocs`
behind a provider-neutral read port.

## Invariants

1. Missing or empty `sourceId` returns `{ sources }` from the existing source
   listing helper.
2. A provided `sourceId` returns `{ docs }` using the existing `draft` status
   and exact source id filter.
3. Source ordering, document ordering/mapping, provider errors, row formats,
   and `maxDuration = 300` remain unchanged.
4. PDF upload, conversion, publish, discard, indexing, and all UI behavior
   remain untouched.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-import-read-rules.test.ts
    - tests/unit/knowledge-base-import-read-application.test.ts
    - tests/unit/knowledge-base-legacy-import-read-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseImportReadQuery`,
  `runKnowledgeBaseImportRead`, and
  `createLegacyKnowledgeBaseImportReadAdapter` to the import GET route;
  POST/PUT/DELETE remain on their existing helpers.
- Full verification at `ceb22b8`: 126 Vitest files / 439 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base import read boundary; the normalized DOM snapshot was
  unchanged.

## Intentional Changes

- Import source/draft selection and response orchestration are now
  independently testable and replaceable.
- Existing import pipeline, response data, and UI behavior remain unchanged.
