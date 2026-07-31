---
schema_version: behavior-contract/v1
id: kv.contacts.read.compatibility
title: Contacts Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate the Contacts read boundary from the route while preserving the nested legacy response.
  non_goals:
    - Change contacts, visit_offers, or pending_invites rows, writes, or schema.
    - Change the Outputs UI, frontend data handling, or response shape.
    - Add migrations or replace the existing Supabase helper.
---

# Contacts Read Compatibility

## Behavior Boundary

The route owns only HTTP transport. The application maps the legacy query
result to an explicit success/error result, while the adapter keeps the exact
Supabase nested select and ordering behind a read port.

## Invariants

1. The adapter reads `contacts` with the existing nested
   `visit_offers(status, created_at, resolved_at)` and
   `pending_invites(id, status, subject, body, slot1, slot2, chosen_slot,
   location, calendar_event_id, to_email, created_at, resolved_at)` select,
   ordered by `created_at` descending.
2. A query error returns HTTP 400 with `{ error: message }`.
3. A successful query returns the raw nested data unchanged, including null or
   provider-defined row values.
4. No Outputs UI, contact/offer/invite write path, row format, retention rule,
   or schema/data behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/contacts-read-application.test.ts
    - tests/unit/contacts-read-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runContactsRead`, `ContactsReadPort`, and
  `createLegacyContactsReadAdapter` through the Contacts module, adapter, and
  `src/app/api/contacts/route.ts`; `getSupabase` remains behind the adapter.
- Full verification at `84cca97`: 75 Vitest files / 363 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Contacts route cutover.

## Intentional Changes

- Contacts query transport and provider access are now isolated behind a
  provider-neutral application boundary and legacy adapter.
- The nested Supabase query, raw response, error mapping, UI, writes, and data
  formats stay unchanged.
