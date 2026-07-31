---
schema_version: behavior-contract/v1
id: kv.checklist.read.compatibility
title: Checklist Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Checklist read transport from the route while preserving the existing row projection.
  non_goals:
    - Change checklist_status rows, writes, or schema.
    - Change the Todos UI, PATCH behavior, or response shape.
    - Add migrations or replace the existing Supabase helper.
---

# Checklist Read Compatibility

## Behavior Boundary

The route owns only HTTP transport. The application maps the legacy query
result to an explicit success/error result, while the adapter keeps the exact
Supabase projection behind a read port.

## Invariants

1. The adapter reads `checklist_status` with the existing `item_id, done`
   projection and does not add ordering or filtering.
2. A query error returns HTTP 400 with `{ error: message }`.
3. A successful query returns the raw row array unchanged.
4. No Todos UI, checklist PATCH path, row format, retention rule, or
   schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/checklist-read-application.test.ts
    - tests/unit/checklist-read-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runChecklistRead`, `ChecklistReadPort`, and
  `createLegacyChecklistReadAdapter` through the Checklist module, adapter, and
  `src/app/api/checklist/route.ts`; `getSupabase` remains behind the adapter.
- Full verification at `f8c5992`: 77 Vitest files / 366 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Checklist route cutover.

## Intentional Changes

- Checklist query transport and provider access are now isolated behind a
  provider-neutral application boundary and legacy adapter.
- The existing `item_id, done` query, raw response, error mapping, UI, PATCH
  path, and data formats stay unchanged.
