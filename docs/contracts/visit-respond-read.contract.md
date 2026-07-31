---
schema_version: behavior-contract/v1
id: kv.visit.respond-read.compatibility
title: Visit Public Response Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Move the Visit public response GET pending_invites query and optimistic confirmation behind a legacy adapter.
  non_goals:
    - Change the HTML response pages, copy, query parameters, or POST fulfilment flow.
    - Change pending_invites row shapes, statuses, or confirmation timestamps.
    - Introduce a workflow/state migration, provider migration, or schema migration.
---

# Visit Public Response Read Compatibility

## Behavior Boundary

`VisitRespondReadPort` owns the pending-invite read/confirm/refetch contract
used by both public GET and POST. `legacy-respond-read-adapter.ts` owns the
existing Supabase table projections, optimistic status filter, refetch query,
and POST's joined contacts projection. `VisitRespondFulfilmentPort` and
`legacy-respond-fulfilment-adapter.ts` own settings, calendar/email/LINE
providers, invite/activity writes, and background research delegation. The
route retains public page rendering/control flow.

## Invariants

1. The initial read still selects `*` from `pending_invites`, filters by
   `id`, and uses `maybeSingle()`.
2. A pending invite still requires choice `1`, `2`, or `both`; confirmation
   updates the existing `status`, `chosen_slot`, and `resolved_at` fields,
   filters by both `id` and `status="pending"`, selects `*`, and uses
   `maybeSingle()`.
3. If the optimistic confirmation returns no row, the route still refetches
   the same invite with `select("*").eq("id", inviteId).single()`.
4. POST still reads `select("*, contacts(name, title, email, company)")` with
   the same id filter and `maybeSingle()` before settings/provider/write work.
5. Existing pending/confirmed/terminal status branches, selected-slot labels,
   HTML copy, response headers, query parameters, and POST side effects remain
   unchanged.
6. Existing pending_invites/contacts schema assumptions and public Visit
   behavior remain unchanged.
7. Fulfilment preserves provider call order: settings → calendar event → invite
   fulfilment update → thank-you email → best-effort LINE confirmation →
   activity success; failures preserve failed invite/activity/LINE handling,
   and successful named contacts still schedule the same best-effort research
   callback.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-respond-read-legacy-adapter.test.ts
    - tests/unit/visit-respond-fulfilment-legacy-adapter.test.ts
    - tests/unit/visit-legacy-schema.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `createLegacyVisitRespondReadAdapter` / `VisitRespondReadPort`
  and `createLegacyVisitRespondFulfilmentAdapter` /
  `VisitRespondFulfilmentPort` to both Visit respond route methods; the
  existing `selectVisitInviteSlot` remains shared by GET and POST.
- Full verification at `13bf09e`: 173 Vitest files / 525 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Visit response read boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- The GET and POST routes no longer own pending_invites read/join/update query
  syntax or provider/data side-effect ownership; those are isolated behind
  replaceable ports/legacy adapters.
- Public HTML/POST behavior, row shapes, status transitions, and UI behavior
  remain unchanged.
