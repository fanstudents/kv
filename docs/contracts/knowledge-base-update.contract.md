---
schema_version: behavior-contract/v1
id: kv.knowledge-base.update.compatibility
title: Knowledge Base Update Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base PATCH validation and result mapping from the route.
  non_goals:
    - Change knowledge_base row formats, version/indexing behavior, or update fields.
    - Change the Knowledge Base UI, response/status mapping, or validation messages.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Update Compatibility

## Behavior Boundary

The rules module validates the id, level, status, and kind and preserves the
existing field coercion (title/category trim, content unchanged, owner string
only, nullable reviewAt). The application module maps provider results to
success, not-found, and error outcomes. The legacy adapter keeps
`updateKnowledgeDoc`, including version increments and indexing.

## Invariants

1. Missing id, invalid level, status, or kind preserve the existing HTTP 400
   messages.
2. A missing document returns HTTP 404 with `找不到這份文件`.
3. Provider errors return HTTP 400 with the provider message or `更新失敗`.
4. A successful update returns the existing raw document JSON.
5. Content whitespace, owner/reviewAt handling, versioning, indexing, row
   formats, and UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-update-rules.test.ts
    - tests/unit/knowledge-base-update-application.test.ts
    - tests/unit/knowledge-base-legacy-update-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseUpdateRequest`,
  `runKnowledgeBaseUpdate`, and `createLegacyKnowledgeBaseUpdateAdapter` to
  the Knowledge Base PATCH route; `updateKnowledgeDoc` remains behind the
  adapter.
- Full verification at `a4df682`: 117 Vitest files / 426 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base update boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- PATCH validation and result/status mapping are now independently testable.
- Existing persistence/indexing, response data, and UI behavior remain
  unchanged.
