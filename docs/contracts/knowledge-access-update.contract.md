---
schema_version: behavior-contract/v1
id: kv.knowledge.access-update.compatibility
title: Knowledge Access Update Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base access validation and persistence from the route.
  non_goals:
    - Change knowledge_access rows, upsert semantics, or schema.
    - Change the Knowledge Base UI, Agent context reads, or response shape.
    - Add migrations or replace the existing Supabase helper.
---

# Knowledge Access Update Compatibility

## Behavior Boundary

The rules module owns catalog membership and level coercion. The application
owns invalid-input branching and invokes a provider-neutral access port. The
legacy adapter keeps the existing `setAgentAccess` helper behind that port.

## Invariants

1. Invalid JSON, `null`, and primitive bodies are treated as empty objects.
   `agentSlug` must be a string present in the supplied Agent catalog; `level`
   continues to use `Number(value)` and accepts only 1, 2, 3, or 4.
2. Invalid input returns HTTP 400 with `{ error: "agentSlug 或 level 不合法" }`
   and does not call the provider.
3. Valid input invokes the existing `setAgentAccess(agentSlug, level)` helper,
   preserving its `knowledge_access` upsert payload and timestamp behavior.
4. Successful updates return `{ ok: true }`. Provider exceptions continue to
   propagate through the existing route/runtime error behavior.
5. No Knowledge Base UI, Agent context/read behavior, row format, retention
   rule, or schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-access-rules.test.ts
    - tests/unit/knowledge-access-application.test.ts
    - tests/unit/knowledge-access-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeAccessUpdateRequest`,
  `runKnowledgeAccessUpdate`, and
  `createLegacyKnowledgeAccessUpdateAdapter` through the Knowledge Base access
  modules, adapter, and route; `setAgentAccess` remains behind the adapter.
- Full verification at `dd14d67`: 91 Vitest files / 389 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base access cutover.

## Intentional Changes

- Knowledge Base access validation and provider access are now unit-tested and
  isolated behind a provider-neutral application boundary.
- The existing upsert helper, success response, error response, UI, and data
  formats stay unchanged.
