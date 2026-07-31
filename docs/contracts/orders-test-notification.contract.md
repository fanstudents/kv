---
schema_version: behavior-contract/v1
id: kv.orders.test-notification.compatibility
title: Orders Test Notification Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate the Orders Agent demo notification plan, delivery orchestration, and legacy LINE/activity side effects from the route.
  non_goals:
    - Change the Teachify demo order fields, LINE message content/style, activity vocabulary, or Orders UI.
    - Add an enabled-state gate to this existing test-only action.
    - Change line_agents or line_agent_activity row shapes, or introduce a schema/provider migration.
---

# Orders Test Notification Compatibility

## Behavior Boundary

The rules module owns the demo order and existing settings interpretation. The
application module owns the delivery/activity sequence and provider error
mapping. The legacy adapter keeps the exact `line_agents` settings query,
`buildPushMessages`, `pushLineRawMessages`, and `line_agent_activity` insert
behind a provider-neutral port. The route retains HTTP status and response
mapping.

## Invariants

1. The adapter still reads only `settings` from `line_agents` where `slug` is
   `orders`; this action intentionally does not check `enabled`.
2. `settings.reportTo` is trimmed and required. Missing or blank recipients
   return HTTP 400 with
   `尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定`.
3. Only `text`, `flex`, `confirm`, and `buttons` are accepted push styles;
   unknown styles fall back to `flex`.
4. The demo order is formatted through the existing `formatOrderText` helper,
   then delivered with title `新訂單通知（測試）` and accent `#F59E0B` using the
   existing LINE message builder/sender.
5. Success records `已送出測試訂單通知` with status `success` and returns
   `{ ok: true, message: "測試通知已送出，請查看 LINE" }`.
6. A delivery or success-activity error records
   `測試訂單通知失敗：{message}` with status `failed`, then returns HTTP 502
   with the provider message (or `推播失敗` for non-Error failures).
7. Existing activity rows, API access behavior, schema assumptions, and Orders
   UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/orders-test-notification-rules.test.ts
    - tests/unit/orders-test-notification-application.test.ts
    - tests/unit/orders-test-notification-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `planOrderTestNotification`, `runOrderTestNotification`,
  `createLegacyOrdersTestNotificationAdapter`, and
  `OrdersTestNotificationPort` only through the Orders test-notify POST route.
- Full verification at `8732ded`: 158 Vitest files / 493 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Orders test-notification boundary; the normalized DOM snapshot was
  unchanged.

## Intentional Changes

- Demo settings interpretation, notification orchestration, and provider
  access are now independently testable and replaceable.
- Existing demo content, LINE behavior, activity wording, status codes,
  persistence assumptions, and UI behavior remain unchanged.
