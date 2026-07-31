---
schema_version: behavior-contract/v1
id: kv.knowledge-base.import-discard.compatibility
title: Knowledge Base Import Discard Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base import discard input and sequential removal orchestration from the route.
  non_goals:
    - Change deletion protection, removal ordering, row formats, or provider behavior.
    - Change the Knowledge Base import UI, response/status mapping, or review workflow.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Import Discard Compatibility

## Behavior Boundary

The rules module keeps only string ids from the discard request. The
application module removes them sequentially and counts only the legacy
`deleted` outcome. The legacy adapter keeps `removeKnowledgeDoc`, including
not-found, built-in protection, and provider exception behavior.

## Invariants

1. Non-string ids are ignored and an empty selection remains a successful
   `{ removed: 0 }` operation.
2. Removal calls preserve input order and are awaited one at a time.
3. Only `deleted` outcomes increment `removed`; `not-found` and
   `builtin-protected` do not.
4. Provider exceptions, row formats, `maxDuration = 300`, and import UI
   behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-import-discard-rules.test.ts
    - tests/unit/knowledge-base-import-discard-application.test.ts
    - tests/unit/knowledge-base-legacy-import-discard-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseImportDiscardRequest`,
  `runKnowledgeBaseImportDiscard`, and
  `createLegacyKnowledgeBaseImportDiscardAdapter` to the import DELETE route;
  the primary Knowledge Base DELETE route keeps its own HTTP status mapping.
- Full verification at `dfd748f`: 132 Vitest files / 445 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base import discard boundary; the normalized DOM snapshot was
  unchanged.

## Intentional Changes

- Discard input filtering and sequential removal counting are now
  independently testable and replaceable.
- Existing deletion, review, response data, and UI behavior remain unchanged.
