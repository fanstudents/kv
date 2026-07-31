---
schema_version: behavior-contract/v1
id: kv.live-task.history.compatibility
title: Live Task History Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Visit history query orchestration and outcome mapping from the route.
  non_goals:
    - Change contacts, visit_offers, or pending_invites row formats.
    - Change TV history rendering, Visit workflow writes, or schema/data behavior.
    - Add migrations or alter the existing Supabase query semantics.
---

# Live Task History Compatibility

## Behavior Boundary

The rules module owns query-agent coercion and the pure outcome projection. The
application module enforces the Visit-only scope, existing eight-contact limit,
parallel relation reads, and empty-list failure boundary. The legacy adapter
keeps the existing contacts/offers/invites queries behind a history port. The
route remains responsible only for query parsing and HTTP output.

## Invariants

1. A non-`visit` agent returns `{ "items": [] }` without reading storage.
2. Visit history selects `contacts` with `source = line_card`, newest first,
   and limit `8`; no contacts or any provider failure returns an empty list.
3. `visit_offers` and `pending_invites` are read for the contact IDs in
   parallel, newest first, and the first status per contact is used.
4. Outcome precedence remains invite `pending`/`sent`/`confirmed` → `已寄邀約`,
   invite `awaiting_approval` → `待核准`, then offer `accepted`/`declined`/
   `pending` → `已確認`/`未安排`/`待回覆`, otherwise `已辨識`.
5. Response item fields remain `{ name, company, outcome, at }`; UI, table
   rows, workflow writes, and schema behavior do not change.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/live-task-history-rules.test.ts
    - tests/unit/live-task-history-application.test.ts
    - tests/unit/live-task-history-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the history rules, application, port, adapter, and route as a
  single boundary; the shared `getSupabase` helper remains behind the adapter.
- Full verification at `6b9eef5` plus this checkpoint: 67 Vitest files / 347
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  history-route cutover.

## Intentional Changes

- Visit history query orchestration and outcome mapping are now unit-tested and
  provider-neutral.
- Existing Supabase query shapes, fallback behavior, item response, TV caller,
  and Visit data formats stay unchanged.
