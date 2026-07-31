---
schema_version: behavior-contract/v1
id: kv.visit.line-webhook-payload.compatibility
title: Visit LINE Webhook Payload Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Move raw JSON payload parsing behind a small transport boundary while preserving the existing webhook workflow.
  non_goals:
    - Change LINE signature verification, event handling, provider calls, or persistence behavior.
    - Change the webhook response payloads, status codes, or empty-event behavior.
    - Change row formats, schema assumptions, or the frontend UI/UX.
---

# Visit LINE Webhook Payload Compatibility

## Behavior Boundary

`parseVisitLineWebhookPayload` owns only the existing raw JSON parsing rule.
The webhook route keeps HTTP mapping, signature handling, event normalization,
handler dispatch, and all provider/data side effects.

## Invariants

1. Valid JSON object payloads produce `{ kind: "valid", events }`.
2. A valid object without `events` still produces an empty event list, so the
   route returns the existing `{ ok: true }` response without event work.
3. The parsed `events` array is passed unchanged to the existing
   `normalizeVisitLineInbound` and handler flow.
4. Malformed JSON and a parsed `null` payload produce `{ kind: "invalid" }`;
   the route still returns `{ error: "invalid payload" }` with HTTP 400.
5. The shared `LineInboundEvent` shape remains the contract between the parser,
   normalizer, and route handler.
6. Signature verification, handlers, LINE providers, Supabase writes,
   schema assumptions, response payloads, and UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
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

- CodeGraph maps `parseVisitLineWebhookPayload` to the LINE webhook route and
  maps the shared `LineInboundEvent` type to the parser, normalizer, and route.
- Full verification at `116885b`: 174 Vitest files / 527 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  transport boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Raw JSON payload parsing is now a small pure module rule with focused tests;
  route orchestration and all business behavior remain in place.
- Handler/provider decomposition, signature policy changes, schema migration,
  and production traffic evidence remain intentionally deferred.
