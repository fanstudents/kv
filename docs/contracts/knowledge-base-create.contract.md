---
schema_version: behavior-contract/v1
id: kv.knowledge-base.create.compatibility
title: Knowledge Base Create Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base POST validation and creation from the route.
  non_goals:
    - Change knowledge_base row formats, id generation, timestamps, or indexing behavior.
    - Change the Knowledge Base UI, response shape, defaults, or status/kind values.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Create Compatibility

## Behavior Boundary

The rules module normalizes the create body and validates the required title
and level. It preserves category, content, kind, and status defaults. The
application module delegates creation through a provider-neutral port. The
legacy adapter keeps `addKnowledgeDoc`, including row construction and
provider error behavior.

## Invariants

1. Missing/invalid title or level returns HTTP 400 with
   `缺少 title 或 level 不合法`.
2. Title and content strings are trimmed; an empty category becomes `未分類`.
3. Unsupported kind values default to `doc`; unsupported status values default
   to `published`.
4. The created document is returned with the existing JSON shape and helper
   generated id/timestamp/index behavior.
5. No Knowledge Base UI, row format, retention, or schema behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-create-rules.test.ts
    - tests/unit/knowledge-base-create-application.test.ts
    - tests/unit/knowledge-base-legacy-create-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseCreateRequest`,
  `runKnowledgeBaseCreate`, and `createLegacyKnowledgeBaseCreateAdapter` to
  the Knowledge Base POST route; `addKnowledgeDoc` remains behind the adapter.
- Full verification at `a4a9a70`: 114 Vitest files / 421 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base create boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Create input normalization and defaults are now unit-tested independently of
  Next.js and the persistence helper.
- Existing persistence, response data, and UI behavior remain unchanged.
