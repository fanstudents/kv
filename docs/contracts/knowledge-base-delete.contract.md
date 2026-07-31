---
schema_version: behavior-contract/v1
id: kv.knowledge-base.delete.compatibility
title: Knowledge Base Delete Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base DELETE input parsing and result mapping from the route.
  non_goals:
    - Change knowledge_base row formats, built-in document protection, or provider behavior.
    - Change the Knowledge Base UI, response/status mapping, or error messages.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Delete Compatibility

## Behavior Boundary

The rules module parses the existing query-string id requirement. The
application module carries the legacy delete outcome without changing its
meaning. The legacy adapter keeps `removeKnowledgeDoc`, including built-in
document protection, not-found handling, and provider exceptions.

## Invariants

1. A missing or empty id returns HTTP 400 with `缺少 id`.
2. A built-in demonstration document returns HTTP 409 with the existing
   explanatory message.
3. A missing document returns HTTP 404 with `找不到這份文件`.
4. A successful delete returns `{ ok: true }`.
5. Provider exceptions, row formats, retention semantics, and UI behavior
   remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-delete-rules.test.ts
    - tests/unit/knowledge-base-delete-application.test.ts
    - tests/unit/knowledge-base-legacy-delete-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseDeleteRequest`, `runKnowledgeBaseDelete`,
  and `createLegacyKnowledgeBaseDeleteAdapter` to the Knowledge Base DELETE
  route; `removeKnowledgeDoc` remains behind the adapter.
- Full verification at `dea36ec`: 120 Vitest files / 430 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base delete boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- DELETE input parsing, provider outcome mapping, and legacy delegation are
  independently testable.
- Existing deletion protection, response data, and UI behavior remain
  unchanged.
