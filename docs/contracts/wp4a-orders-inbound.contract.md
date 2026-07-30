---
schema_version: behavior-contract/v1
id: kv.wp4a.orders-inbound
title: Ray Orders Inbound Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Move Teachify payload interpretation out of the webhook route without changing behavior.
  non_goals:
    - Change webhook signature verification.
    - Change database rows, Agent settings, LINE messages, response bodies, or status codes.
    - Add a migration, retry policy, outbox, or production traffic switch.
    - Change any browser UI or preview.
---

# Ray Orders Inbound Compatibility

## Behavior Boundary

In scope is deterministic conversion of existing Teachify order-like and
`course.student_enroll` payloads into the current normalized order shape. The
route continues to own transport parsing, signature handling, persistence,
configuration, LINE delivery, activity logging, and HTTP responses.

## Consumers And Entrypoints

- `POST /api/webhooks/teachify-order`
- `src/modules/orders/inbound.ts#parseOrderPayload`
- `src/lib/teachify-orders.ts#formatOrderText`
- `src/modules/orders/notification.ts#planOrderNotification`
- `src/modules/orders/legacy-schema.ts#toLegacyTeachifyOrderUpsert`
- `src/modules/orders/ports.ts`
- `src/modules/orders/application.ts#processOrderPayload`
- `src/adapters/orders/legacy-orders-adapters.ts#createLegacyOrdersAdapters`
- `teachify_orders`, `line_agents`, and `line_agent_activity` remain legacy
  adapter concerns.

## Inputs And State

- Input is unknown JSON after the route has parsed the raw request body.
- Direct order objects and the existing `order` or `data` wrappers are accepted
  when the candidate has `id` plus `amount`, `trade_no`, or `items`.
- The enrollment fallback accepts only `type = course.student_enroll` with
  string course and user names.

## Outputs And Side Effects

- Returns the exact current `NormalizedOrder` shape or `null`.
- Performs no I/O, persistence, logging, provider call, time lookup, or
  environment access.
- The existing route retains all side effects and their order.

## UI States

No browser-visible state is changed. The Orders page, preview text, Agent
catalog, navigation, loading, ready, empty, and error presentation remain
frozen.

## Invariants

1. Numeric and string coercion, fallback labels, refund detection, and nullable
   fields remain byte-for-byte compatible with the previous parser.
2. Unknown `course.*` events do not become orders.
3. Enrollment events do not invent amount, trade number, coupon, or refund.
4. Parser code imports no Next, Supabase, LINE, OpenAI, Google, or server-only
   module.
5. Signature verification still occurs against the raw body before JSON
   parsing or normalization.
6. The persistence mapper preserves every current column, nullable fallback,
   and `source = webhook`.
7. Agent disablement, recipient trimming, push-style fallback, notification
   copy, title, accent, and activity summary remain deterministic pure rules.
8. The route depends on Orders repository and delivery ports; the legacy
   adapter preserves table names, upsert conflict key, Agent selector, activity
   rows, LINE renderer, and provider errors.
9. Application ordering remains: normalize, persist, load Agent config, plan,
   deliver, then record success. Only delivery errors become the current
   `delivery_failed` outcome; earlier adapter errors still propagate.

## Acceptance Examples

Given a direct order with `id`, `trade_no`, string amount, items, and refunded
status, when normalized, then IDs and numbers retain current coercion, named
items are kept, and `isRefund` is true.

Given a `course.student_enroll` event with a course and user, when normalized,
then it produces an order with zero amount and blank trade number so the
existing notification explicitly reports missing payment detail.

Given any other course event, when normalized, then it returns `null` and the
route retains its current acknowledged-but-unrecognized response.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/orders-inbound.test.ts
    - tests/unit/orders-notification.test.ts
    - tests/unit/orders-legacy-adapters.test.ts
    - tests/unit/orders-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- Pre-change CodeGraph: `verifyTeachifyWebhook` affects the webhook `POST`
  entrypoint; route-local upsert logic has no independently indexed symbol.
- Direct source mapping identifies all current DB, settings, LINE, activity,
  and response branches in the webhook route.

## Intentional Changes

- `NormalizedOrder` becomes Orders-owned domain data.
- Payload normalization moves from a server-only transport helper into a pure
  Orders module.

## Open Questions

- Official Teachify order webhook schema and signature contract remain
  unverified external evidence.
- Delivery idempotency and outbox adoption belong to later WP4A stages.
