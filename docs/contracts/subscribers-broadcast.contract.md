---
schema_version: behavior-contract/v1
id: kv.subscribers.broadcast.compatibility
title: Subscribers Broadcast Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate broadcast request mapping, fan-out orchestration, and legacy Supabase/LINE side effects from the route.
  non_goals:
    - Change line_subscribers, broadcast_logs, or message payload row shapes.
    - Change the Subscribers UI, broadcast response envelope, or existing statuses.
    - Add a delivery queue, provider migration, credential rotation, or schema migration.
---

# Subscribers Broadcast Compatibility

## Behavior Boundary

The rules module owns the existing request normalization. The application
module owns log reads, recipient selection outcomes, Promise.allSettled fan-out
counts, and log-row construction. The legacy adapter keeps Supabase queries,
LINE message construction/delivery, and `broadcast_logs` inserts behind a
provider-neutral port. Routes retain HTTP response mapping.

## Invariants

1. GET reads `broadcast_logs` with `select("*")`, `created_at` descending order,
   and limit `30`; a query error returns HTTP 400 with its message, otherwise
   the raw data array is returned unchanged.
2. POST trims `text` and requires non-empty content, returning HTTP 400 with
   `缺少要推播的訊息內容` when absent.
3. `tags` keeps only string entries without additional trimming; channel accepts
   `primary`/`support` and otherwise uses `all`; style accepts `text`/`flex`/
   `confirm`/`buttons` and otherwise uses `text`; title defaults to `團隊公告`;
   invalid colors default to `#06C755`.
4. Recipient queries still select `id, line_user_id, channel`, apply `overlaps`
   only when tags exist, and apply an `eq("channel", ...)` filter only for a
   non-`all` channel. Query errors and an empty recipient set return HTTP 400
   with the existing provider/no-recipient message.
5. Each recipient is sent the existing built message through its stored
   channel. `Promise.allSettled` counts fulfilled and failed sends independently;
   one failed delivery does not abort the other sends.
6. The inserted `broadcast_logs` row preserves tag/channel filters, style/text,
   recipient count, success count, and failed count. Success returns
   `{ ok: true, recipientCount, successCount, failedCount }`.
7. Existing API access behavior, persistence rows, schema assumptions, and
   Subscribers UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/subscribers-broadcast-rules.test.ts
    - tests/unit/subscribers-broadcast-application.test.ts
    - tests/unit/subscribers-broadcast-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseSubscribersBroadcastRequest`,
  `runSubscribersBroadcast`, `runSubscribersBroadcastRead`,
  `createLegacySubscribersBroadcastAdapter`, and
  `SubscribersBroadcastPort` to the broadcast route's GET/POST methods.
- Full verification at `212b482`: 161 Vitest files / 501 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  broadcast boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Broadcast normalization, fan-out accounting, persistence payload mapping,
  and provider access are now independently testable and replaceable.
- Existing filters, delivery semantics, activity/data rows, response statuses,
  and UI behavior remain unchanged.
