---
schema_version: behavior-contract/v1
id: kv.wp1.runtime-kernel
title: KV Additive Runtime Kernel
status: active
owner_surface: platform
change_context:
  type: refactor
  reason: Establish provider-independent execution contracts before migrating legacy flows.
  non_goals:
    - Route production traffic through the new kernel.
    - Add or change database migrations while U-01 remains open.
    - Change Agent personas, UI, API behavior, or provider integrations.
---

# KV Additive Runtime Kernel

## Behavior Boundary

The Runtime Kernel owns versioned events, composable Agent/workflow bindings,
run states, optimistic state transitions, idempotent event acceptance, leases,
artifacts, and delivery outbox contracts. It imports no framework, database, or
provider SDK.

## Consumers And Entrypoints

- Future compatibility facade around `src/lib/agent-runs.ts`.
- Visit, Meeting, Knowledge, scheduled jobs, and short request/response flows.
- Fake repositories and simulations in this work package.
- Future Supabase repositories after the production schema baseline is closed.

## Inputs And State

- `AgentRoleTemplate` describes responsibility and capabilities only.
- `AgentInstance` composes a role with versioned workflows, triggers, and an
  execution profile.
- `EventEnvelope` carries version, correlation, causation, and idempotency.
- `RunRecord.stateVersion` is the optimistic-concurrency token.

## Outputs And Side Effects

- Pure state transitions return a new record and never mutate the input.
- In-memory repositories clone records at their boundary.
- Delivery intent is enqueued idempotently; no provider is called.
- No legacy route, database table, or UI is changed.

## Invariants

1. Event/cron/callback/request is an entrypoint or execution profile, never an
   Agent subtype.
2. Terminal runs cannot transition.
3. Every accepted transition increments `stateVersion` exactly once.
4. Stale expected versions and illegal transitions are rejected.
5. Duplicate event and delivery idempotency keys resolve to one record.
6. Only one live lease owner can claim a run or outbox item.
7. Runtime platform code imports no Next, Supabase, Google, LINE, OpenAI, or
   other provider SDK.
8. Event append and run creation share one repository admission transaction;
   no consumer can observe an event whose run does not exist.
9. A trigger resolves to at most one workflow binding on an Agent instance.
10. Workflow graphs reject missing nodes, ambiguous ownership, and malformed
    terminal/activity nodes before execution.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/runtime-kernel.test.ts
    - tests/unit/runtime-profiles.test.ts
    - tests/unit/workflow-composition.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  manual:
    - Chrome before/after checks of /login and /agents-catalog.
```

## Evidence

- CodeGraph shows legacy `startRun` affects 13 symbols and `logStep` /
  `finishRun` each affect 17, concentrated in Visit and contact research.
- `delegate` currently has no callers. The additive kernel therefore starts
  beside the legacy facade and does not modify those shared callers.
- Pre-change Chrome check on 2026-07-31 confirmed the login surface in a clean
  Chrome tab. The original controlled tab was temporarily blocked by another
  extension UI; no code change began until the fresh-tab check passed.
- CodeGraph after indexing the additive platform:
  - `RuntimeKernel` affects only its own methods and the Runtime unit harness;
  - `transitionRun` affects only the Kernel and Runtime tests;
  - no legacy route or `src/lib/agent-runs.ts` caller is connected to the new
    platform.
- Simulation evidence:
  - parallel duplicate event acceptance produces one event and one run;
  - request/response completes;
  - short event deduplicates;
  - long-lived event waits and resumes;
  - scheduled batch retries and recovers;
  - realtime session and legacy relay share the same binding contract without
    being forced through the finite-run executor;
  - outbox lease, retry, delivery, and dead-letter ownership is explicit.
- Full verification: nine Vitest files / 88 tests passed; lint, route-aware
  typecheck, production build (93 pages), and all 130 Playwright smoke cases
  passed.
- Chrome checks bracketed every Runtime adjustment batch. Final `/login` and
  `/agents-catalog` headings, controls, route, tiers, and inventory matched the
  pre-change state.

## Intentional Changes

- Add provider-independent platform contracts, state machine, repositories,
  in-memory adapters, and simulations.
- No production traffic or browser-visible behavior changes.
