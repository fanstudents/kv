---
schema_version: behavior-contract/v1
id: kv.subscribers.read.compatibility
title: Subscribers Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Subscribers read transport from the route while preserving the existing raw row response.
  non_goals:
    - Change line_subscribers rows, writes, broadcast behavior, or schema.
    - Change the Subscribers UI, PATCH behavior, or response shape.
    - Add migrations or replace the existing Supabase helper.
---

# Subscribers Read Compatibility

## Behavior Boundary

The route owns only HTTP transport. The application maps the legacy query
result to an explicit success/error result, while the adapter keeps the exact
Supabase projection and ordering behind a read port.

## Invariants

1. The adapter reads `line_subscribers` with `select("*")`, ordered by
   `last_seen_at` descending.
2. A query error returns HTTP 400 with `{ error: message }`.
3. A successful query returns the raw subscriber rows unchanged.
4. No Subscribers UI, PATCH/broadcast/relay write path, row format, retention
   rule, or schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/subscribers-read-application.test.ts
    - tests/unit/subscribers-read-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runSubscribersRead`, `SubscribersReadPort`, and
  `createLegacySubscribersReadAdapter` through the Subscribers module, adapter,
  and `src/app/api/subscribers/route.ts`; `getSupabase` remains behind the
  adapter.
- Full verification at `c88c47f`: 79 Vitest files / 369 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Subscribers route cutover.

## Intentional Changes

- Subscribers query transport and provider access are now isolated behind a
  provider-neutral application boundary and legacy adapter.
- The existing `select("*")`, ordering, raw response, error mapping, UI,
  writes, and data formats stay unchanged.
