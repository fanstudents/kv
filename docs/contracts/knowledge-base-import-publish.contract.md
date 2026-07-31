---
schema_version: behavior-contract/v1
id: kv.knowledge-base.import-publish.compatibility
title: Knowledge Base Import Publish Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base import review publish input and orchestration from the route.
  non_goals:
    - Change publish status, indexing, row formats, or review workflow semantics.
    - Change the Knowledge Base import UI, response/status mapping, or error message.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Import Publish Compatibility

## Behavior Boundary

The rules module keeps only string ids from the request body and preserves the
empty-selection validation. The application module delegates the selected ids
to a provider-neutral publish port. The legacy adapter keeps
`publishKnowledgeDocs`, including status update, post-publish indexing, and
provider error behavior.

## Invariants

1. Invalid or empty ids return HTTP 400 with
   `沒有指定要發布的條目`.
2. Valid string ids are passed in their existing order without trimming,
   deduplication, or format changes.
3. The response remains `{ published: count }`.
4. Publish status updates, indexing, row formats, provider errors,
   `maxDuration = 300`, and import UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-import-publish-rules.test.ts
    - tests/unit/knowledge-base-import-publish-application.test.ts
    - tests/unit/knowledge-base-legacy-import-publish-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseImportPublishRequest`,
  `runKnowledgeBaseImportPublish`, and
  `createLegacyKnowledgeBaseImportPublishAdapter` to the import PUT route;
  `publishKnowledgeDocs` remains behind the adapter.
- Full verification at `4bae9ff`: 129 Vitest files / 442 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base import publish boundary; the normalized DOM snapshot was
  unchanged.

## Intentional Changes

- Publish input validation and orchestration are now independently testable
  and replaceable.
- Existing review, indexing, response data, and UI behavior remain unchanged.
