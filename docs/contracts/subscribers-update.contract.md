---
schema_version: behavior-contract/v1
id: kv.subscribers.update.compatibility
title: Subscribers Update Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Subscribers PATCH parsing and persistence from the route.
  non_goals:
    - Change line_subscribers rows, update semantics, or schema.
    - Change the Subscribers UI, broadcast behavior, relay behavior, or response shape.
    - Add migrations or replace the existing Supabase helper.
---

# Subscribers Update Compatibility

## Behavior Boundary

The rules module owns PATCH field filtering. The application owns invalid-input
and provider-result mapping. The legacy adapter keeps the existing
`line_subscribers` update/select/single chain behind a write port.

## Invariants

1. Invalid JSON, `null`, and primitive bodies are treated as empty objects.
   `tags` is accepted only when it is an array; only string entries whose
   trimmed value is non-empty are retained, while their original text is
   preserved. `note` is accepted for any string value, including an empty
   string.
2. A body with no recognized fields returns HTTP 400 with
   `{ error: "沒有可更新的欄位" }` and does not call the provider.
3. The write payload remains the filtered `{ tags?, note? }` object and the
   adapter preserves `.from("line_subscribers").update(fields).eq("id", id)
   .select().single()`.
4. A provider error returns HTTP 400 with `{ error: message }`; success returns
   the raw selected row unchanged.
5. No Subscribers UI, broadcast/relay behavior, row format, retention rule, or
   schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/subscribers-update-rules.test.ts
    - tests/unit/subscribers-update-application.test.ts
    - tests/unit/subscribers-update-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseSubscribersUpdateRequest`, `runSubscribersUpdate`,
  and `createLegacySubscribersUpdateAdapter` through the Subscribers update
  modules, adapter, and `[id]` route; the existing `line_subscribers` write
  remains behind the adapter.
- Full verification at `78d5ce2`: 88 Vitest files / 384 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Subscribers PATCH cutover.

## Intentional Changes

- Subscribers PATCH field filtering, invalid-input handling, and provider access
  are now unit-tested and isolated behind a provider-neutral application
  boundary.
- The existing update payload, raw success row, HTTP error mapping, UI, and
  data formats stay unchanged.
