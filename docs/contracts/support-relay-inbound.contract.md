---
schema_version: behavior-contract/v1
id: kv.support.relay-inbound
title: Amber LINE Legacy Relay Inbound Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate deterministic LINE payload and capture rules from the relay route.
  non_goals:
    - Turn Amber into an automated reply workflow.
    - Change signature verification, relay URL, timeout, headers, or raw body.
    - Change subscriber, conversation, or activity persistence.
    - Change partial-failure isolation, reply-token ownership, or HTTP responses.
    - Add migrations, retries, an outbox, deduplication, or real traffic.
    - Change any browser UI, copy, state, layout, or interaction.
---

# Amber LINE Legacy Relay Inbound Compatibility

## Behavior Boundary

In scope is parsing the already signature-verified raw LINE body and deciding
which events produce Amber's side-channel customer-message capture. The legacy
system remains the sole reply owner; KV still forwards the original body and
signature and only records text messages.

## Consumers And Entrypoints

- `GET /api/line/webhook/support`
- `POST /api/line/webhook/support`
- `src/modules/support/relay-inbound.ts`
- `src/modules/support/relay-ports.ts`
- `src/modules/support/relay-application.ts#processSupportRelay`
- `src/adapters/support/legacy-support-relay-adapters.ts`
- Existing `touchSubscriber` and `logConversationMessage` integrations remain
  server/adapter concerns.

## Inputs And State

- Raw request body after LINE signature verification.
- LINE-like events with optional source user and message data.
- Existing environment-backed relay target and request headers remain route
  concerns during this stage.

## Outputs And Side Effects

- Parsing returns the decoded `events` value or an invalid-payload result.
- Capture planning skips every event except `message` + `text`.
- A capture plan contains the current user fallback, text fallback, subscriber
  touch hint, customer conversation role, and exact activity summary.
- The module performs no I/O, environment access, signature verification,
  database access, fetch, provider call, logging, or response mapping.

## UI States

No browser-visible state changes. Amber's page, Agent catalog, navigation, and
all UI states remain frozen.

## Invariants

1. Signature verification occurs against the raw body before JSON parsing.
2. Missing/invalid JSON retains the `400 {"error":"invalid payload"}` path.
3. A missing `events` property still behaves as an empty list.
4. Non-text and non-message events produce no subscriber or persistence work.
5. Missing user ID becomes `未知使用者`; missing text becomes the empty string.
6. Subscriber touch is requested only when a source user ID exists.
7. Activity copy keeps only the first 60 UTF-16 code units via `slice`.
8. Conversation capture keeps the full text and role `customer`.
9. Raw relay and side-channel captures remain concurrent and isolated through
   the route's existing `Promise.allSettled` structure.
10. KV never consumes the reply token and never sends a customer reply.
11. Relay failures keep the current activity copy and still return the
    acknowledged response after settled side effects.

## Acceptance Examples

Given malformed JSON after a valid signature, parsing returns invalid.

Given a follow or image event, capture planning returns `skip`.

Given a text message with a user ID, capture planning returns the exact
subscriber hint, full conversation text, and 60-character activity preview.

Given a text event without a source user, capture planning uses `未知使用者` and
does not request subscriber touch.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/support-relay-inbound.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- Pre-change CodeGraph maps `forwardToLegacySystem` only to the Support route
  and its `POST`.
- Generic `POST` impact is noisy across 60 symbols; direct route-path mapping
  is therefore required.
- `logConversationMessage` reaches the Support route and manual bot-reply
  route; `touchSubscriber` reaches both LINE webhook routes.

## Intentional Changes

- Deterministic payload and capture decisions become Support-owned pure
  functions.
- The route delegates those decisions while retaining transport and all I/O.
- Support-owned ports describe relay, activity, subscriber, and conversation
  capabilities; the legacy adapter preserves the raw fetch and existing
  Supabase/helper implementations.
- Support relay orchestration is executable against fake ports while retaining
  the existing nested settled-failure boundaries.

## Open Questions

- The legacy target's idempotency, timeout recovery, and traffic observability
  remain external evidence.
