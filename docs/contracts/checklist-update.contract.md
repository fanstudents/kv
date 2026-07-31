---
schema_version: behavior-contract/v1
id: kv.checklist.update.compatibility
title: Checklist Update Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Checklist PATCH parsing and persistence from the route.
  non_goals:
    - Change checklist_status rows, upsert semantics, or schema.
    - Change the Todos UI, optimistic state, or response shape.
    - Add migrations or replace the existing Supabase helper.
---

# Checklist Update Compatibility

## Behavior Boundary

The rules module owns `done` coercion and route-id mapping. The application
owns timestamp creation and provider-result mapping. The legacy adapter keeps
the existing upsert/select/single chain behind a write port.

## Invariants

1. Invalid JSON is treated as an empty body; `done` is coerced with
   `Boolean(body.done)` and the route id becomes `item_id`.
2. The write payload remains `{ item_id, done, updated_at }`, with a fresh ISO
   timestamp, followed by `.select().single()`.
3. A provider error returns HTTP 400 with `{ error: message }`; success returns
   the raw selected row unchanged.
4. No Todos UI, optimistic update behavior, row format, retention rule, or
   schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/checklist-update-rules.test.ts
    - tests/unit/checklist-update-application.test.ts
    - tests/unit/checklist-update-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseChecklistUpdateRequest`, `runChecklistUpdate`, and
  `createLegacyChecklistUpdateAdapter` through the Checklist update modules,
  adapter, and `[id]` route; the existing `checklist_status` write remains
  behind the adapter.
- Full verification at `4f3c8aa`: 85 Vitest files / 379 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Checklist PATCH cutover.

## Intentional Changes

- Checklist PATCH coercion, timestamp generation, and provider access are now
  unit-tested and isolated behind a provider-neutral application boundary.
- The existing upsert payload, raw success row, HTTP error mapping, UI, and data
  formats stay unchanged.
