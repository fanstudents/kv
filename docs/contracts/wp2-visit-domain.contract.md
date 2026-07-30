---
schema_version: behavior-contract/v1
id: kv.wp2.visit-domain
title: Coco Visit Pure Domain Workflow
status: active
owner_surface: module
change_context:
  type: refactor
  reason: Extract Visit decisions from its LINE route without changing traffic or side effects.
  non_goals:
    - Invoke LINE, Google, OpenAI, Gmail, or Supabase.
    - Change existing messages, pages, routes, or UI.
    - Enable shadow or new traffic before adapters and parity fixtures exist.
---

# Coco Visit Pure Domain Workflow

## Behavior Boundary

This package defines Visit states, domain events, deterministic transitions,
and side-effect intents. Adapters remain responsible for signatures, payload
parsing, persistence, provider calls, HTML/LINE rendering, and delivery.

## Consumers And Entrypoints

- Future LINE adapter mapping image, text, and postback input to Visit events.
- Future public response adapter mapping invite choice/location to events.
- Future cron adapter mapping offer timeout to an event.
- Shadow comparison fixtures; no production caller yet.

## Inputs And State

- Contact fields are domain data, not provider payloads.
- Approval requirement is captured when schedule options are prepared.
- Provider outcomes return as explicit success/failure events.
- Named workflow transitions describe branches without an expression language.

## Outputs And Side Effects

- `reduceVisit` returns the next immutable state and a list of intents.
- `projectVisitLegacyLiveTask` translates domain truth to the existing
  `nodeId / step / status` protocol without importing the legacy store.
- `replayVisit` executes captured domain events without executing any intent,
  providing the deterministic seam for parity fixtures and future shadow mode.
- `executeVisitIntents` requires an exhaustive typed handler map in execute
  mode. Its record-only mode cannot receive handlers and cannot cause provider
  or persistence side effects.
- `legacy-schema.ts` is the anti-corruption boundary for the current
  `contacts`, `visit_offers`, and `pending_invites` row shapes. The domain does
  not import or expose those rows.
- `parseVisitFlowMode` defaults to `legacy`, rejects typos, and makes legacy,
  shadow evaluation, and new-intent ownership explicit.
- `evaluateVisitEvent` produces domain truth, compatibility projection, and a
  record-only intent plan without reaching persistence or providers.
- `line-inbound.ts` normalizes LINE image, text, and postback payloads into
  provider-free input and preserves the existing decision-word precedence.
- Intents describe persistence, AI, calendar, mail, LINE, lock, artifact, and
  research work; the reducer performs none of them.
- No legacy source file is imported by the Visit module.

## Invariants

1. Every event is valid only for explicit source states.
2. Corrections keep the workflow waiting for the operator's decision.
3. Approval-required drafts cannot deliver before approval.
4. Delivery intent uses an idempotency key independent from content generation.
5. Contact response and calendar fulfilment do not regenerate the invite.
6. Timeout can only close an unresolved offer.
7. External failure is data, never a swallowed exception.
8. Legacy projection preserves the current terminal-state quirks because
   `endVisitRun` does not mutate `agent_live_task`.
9. Intent execution is ordered; the first failure stops execution and returns
   completed receipts for reconciliation.
10. Delivery and fulfilment idempotency keys survive planning and execution.
11. Existing database column names and legacy status strings remain unchanged.
12. Rehydration maps only durable states; transient provider activity is never
    guessed from incomplete rows.
13. Legacy mode is the default. Shadow evaluates new logic but owns no effects.
14. An invalid rollout mode fails configuration validation instead of silently
    enabling a different path.
15. Cancellation is classified before confirmation/send because phrases such
    as `不要` contain a positive keyword.
16. Unknown or incomplete LINE payloads become explicit ignored reasons.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-domain.test.ts
    - tests/unit/visit-projection.test.ts
    - tests/unit/visit-replay.test.ts
    - tests/unit/visit-intent-executor.test.ts
    - tests/unit/visit-legacy-schema.test.ts
    - tests/unit/visit-application.test.ts
    - tests/unit/visit-line-inbound.test.ts
    - tests/unit/workflow-composition.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  manual:
    - Chrome before/after checks of /login and /agents-catalog.
```

## Evidence

- CodeGraph keeps `handleImageMessage` and `handlePostback` inside the LINE
  route; offer and approval handlers feed that same route entrypoint.
- Source mapping identified `visit_offers` pending/accepted/declined,
  `pending_invites` awaiting_approval/pending/confirmed/cancelled/failed, and
  the separate Runtime/live-step projection.
- CodeGraph impact mapping found `reportVisitStep` affects 9 symbols,
  `setLiveTask` affects 15, and `currentStep` affects 4. The projection is kept
  pure and unconnected until adapter parity is proven.
- Five source-linked replay scenarios cover recognition failure, no-email
  completion, decline, direct delivery, and approval plus fulfilment failure.
- CodeGraph shows `handleImageMessage` reaches 3 symbols and
  `handleVisitOfferReply` reaches 5, both converging on the LINE route. The new
  reducer remains isolated at 4 symbols, so parity can be proven before traffic
  wiring changes that route.
- Provider impact mapping: `parseBusinessCard` reaches 7 symbols, `sendGmail`
  9, `findFreeSlots` 6, and `acquireLock` 5. Their existing implementations
  remain untouched behind the future handler adapters.
- Pre-change Chrome check on 2026-07-31 confirmed `/login`.

## Intentional Changes

- Add pure Visit domain and workflow definitions only.
- Extend generic workflow nodes with named branch transitions.
- Legacy traffic and browser behavior remain unchanged.
