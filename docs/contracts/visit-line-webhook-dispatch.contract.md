---
schema_version: behavior-contract/v1
id: kv.visit.line-webhook-dispatch.compatibility
title: Visit LINE Webhook Dispatch Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Move post-signature event fan-out and failure isolation behind an application boundary without moving business handlers yet.
  non_goals:
    - Change image, text, or postback business handlers, provider calls, or persistence writes.
    - Change signature verification, payload parsing, response mapping, or the frontend UI/UX.
    - Change subscriber, event, or database row formats.
---

# Visit LINE Webhook Dispatch Compatibility

## Behavior Boundary

`dispatchVisitLineWebhookEvents` owns only the existing event fan-out after
signature and payload validation. It keeps the subscriber touch, inbound
normalization, handler selection, fallback user id, base URL forwarding, and
`Promise.allSettled` failure isolation. The route still owns HTTP concerns and
injects the existing image/text/postback handlers unchanged.

## Invariants

1. Events without a reply token are skipped without subscriber or handler work.
2. Events with a source user id touch that subscriber with channel `primary`;
   touch failures remain swallowed. Missing source user ids still use the
   existing fallback user id and do not trigger a subscriber touch.
3. Normalization receives the original event with the resolved user id merged
   into `source`, preserving the existing image/text/postback/ignored routing.
4. Image, text, and postback handlers receive the same raw event, resolved user
   id, and (for text/postback) the same `baseUrl` as before.
5. Unsupported or ignored inbound events invoke no handler.
6. Handler rejection for one event does not reject the webhook fan-out or stop
   other events; the route still returns `{ ok: true }` after `Promise.allSettled`.
7. Signature verification, payload parsing, provider calls, persistence writes,
   response payloads/statuses, data formats, and UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-line-webhook-application.test.ts
    - tests/unit/visit-line-webhook-rules.test.ts
    - tests/unit/visit-line-inbound.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `dispatchVisitLineWebhookEvents` to the LINE webhook `POST`
  and maps `normalizeVisitLineInbound` through the new application boundary
  and the route; the shared event type remains local to the same flow.
- Full verification at `c7e7b01`: 175 Vitest files / 530 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  dispatch boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Webhook event dispatch is now a small injectable application boundary with
  focused tests; all existing business handlers remain in the legacy route.
- Handler/provider decomposition, signature policy changes, schema migration,
  reconciliation, and production traffic evidence remain intentionally deferred.
