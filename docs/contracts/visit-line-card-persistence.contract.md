---
schema_version: behavior-contract/v1
id: kv.visit.line-card-persistence.compatibility
title: Visit LINE Card Persistence Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Move the existing contacts and visit_offers inserts behind a legacy persistence adapter.
  non_goals:
    - Change insert payloads, projections, error handling, or row formats.
    - Change locks, run tracking, tags, replies, provider behavior, or flow order.
    - Introduce a schema migration or change the frontend UI/UX.
---

# Visit LINE Card Persistence Compatibility

## Behavior Boundary

`VisitLineCardPersistencePort` owns only the two writes performed after a
recognized business card: inserting the legacy `contacts` row and inserting
the legacy `visit_offers` row. `legacy-line-card-adapter.ts` owns the existing
Supabase queries and schema mapping helpers. The route keeps all orchestration,
locks, reports, tags, replies, and ordering.

## Invariants

1. Contact insertion still uses `toLegacyContactInsert(contact, lineUserId)` and
   `contacts.insert(...).select().single()`.
2. Offer insertion still uses `toLegacyVisitOfferInsert(lineUserId,
   contactRow?.id)` and `visit_offers.insert(...).select().single()`.
3. A null/empty returned row is passed through as before; the route continues
   to conditionally build tag/decision messages from `row?.id`.
4. Supabase errors remain represented by the same absent data behavior; no new
   retry, transaction, or compensation is introduced.
5. Legacy row fields, status vocabulary, schema assumptions, lock/release
   order, activity/run tracking, replies, provider calls, and UI behavior
   remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-line-card-legacy-adapter.test.ts
    - tests/unit/visit-legacy-schema.test.ts
    - tests/unit/visit-line-image-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `createLegacyVisitLineCardAdapter` to the LINE webhook route;
  `rg` confirms the route no longer imports or calls either legacy insert
  mapping helper directly.
- Full verification at `7fcf1af`: 177 Vitest files / 532 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  card persistence boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Card persistence now has an explicit port/legacy-adapter seam with focused
  tests while preserving the existing data format exactly.
- Image-flow application decomposition, schema migration, reconciliation, and
  production traffic evidence remain deferred.
