---
schema_version: behavior-contract/v1
id: kv.agent-chat.rules
title: Agent Chat Request And Response Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate deterministic request and reply decisions from the Agent chat route.
  non_goals:
    - Change Agent identity, catalog copy, prompts, context, or canvas behavior.
    - Change OpenAI, knowledge, meeting-context, or provider implementations.
    - Change HTTP status codes or response copy.
    - Add persistence, migrations, retries, streaming, or real provider calls.
    - Change any browser UI, copy, state, layout, or interaction.
---

# Agent Chat Request And Response Compatibility

## Behavior Boundary

In scope is coercing the decoded JSON body into the existing Agent chat input
and applying the current empty-reply fallback. Agent lookup, context loading,
OpenAI reply generation, canvas enrichment, HTTP mapping, and authentication
remain outside the pure module during this stage.

## Consumers And Entrypoints

- `POST /api/agent-chat`
- `src/modules/agent-chat/rules.ts`
- `src/modules/agent-chat/ports.ts`
- `src/modules/agent-chat/application.ts#runAgentChat`
- `src/adapters/agent-chat/legacy-agent-chat-adapters.ts`
- Existing `AGENTS`, `getAgentLiveContext`, `replyToChat`, and
  `buildCanvasForReply` integrations remain unchanged.

## Inputs And State

- An unknown decoded JSON value.
- Existing fields: `agentSlug`, `message`, and `history`.
- The rule module has no environment, database, provider, or browser state.

## Outputs And Side Effects

- Valid input returns the exact normalized request fields.
- Invalid input returns `null` and retains the route's current 400 response.
- Empty generated text receives the existing user-facing fallback.
- The module performs no I/O.

## UI States

No browser-visible state changes. The Agent catalog, chat component, canvas,
navigation, and all copy remain frozen.

## Invariants

1. `agentSlug` must be a string and remains untrimmed.
2. `message` must be a string and is trimmed before validation and use.
3. `history` must be a string; otherwise it becomes the empty string.
4. Missing, empty, or whitespace-only messages remain invalid.
5. A missing or empty Agent slug remains invalid.
6. Extra request fields are ignored.
7. Empty generated reply text becomes `收到，我確認後回覆您。`.
8. Agent lookup, context failure isolation, reply errors, and canvas failure
   isolation retain their current route behavior.

## Acceptance Examples

Given `{agentSlug: "report", message: "  看報表  ", history: "之前"}`, parsing
returns the same slug and history with message `看報表`.

Given a whitespace-only message or missing slug, parsing returns `null`.

Given non-string history, parsing returns valid input with empty history.

Given empty generated reply text, the response rule returns the exact existing
fallback copy.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/agent-chat-rules.test.ts
    - tests/unit/agent-chat-legacy-adapters.test.ts
    - tests/unit/agent-chat-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- Pre-change CodeGraph maps `replyToChat` and `buildCanvasForReply` only to
  their provider/helper files and `src/app/api/agent-chat/route.ts`.
- `getAgentLiveContext` is shared by Agent chat and Meeting realtime session,
  so this refactor must not move or alter that implementation.
- Checkpoints: `515f7d9` (rules), `956fb01` (legacy adapters), and `3acdad6`
  (application orchestration).
- Post-change CodeGraph maps the Agent chat parser, application, and adapter
  only to the Agent chat route; the context helper retains its separate
  Meeting realtime consumer.
- `npm run verify:full` passed with 34 Vitest files / 244 tests, a 93-page
  production build, and 130 Playwright smoke cases.
- The real Chrome Agent catalog retained the count and all three tier labels
  before and after the refactor.
- No production schema, row, provider endpoint, prompt, or browser UI changed.

## Intentional Changes

- Deterministic request coercion and empty-reply fallback become owned by the
  Agent chat product module.
- Agent identity, context, reply, and opaque canvas capabilities are described
  by Agent chat-owned ports.
- The legacy adapter preserves the existing catalog, meeting-context, OpenAI,
  and canvas implementations.
- Application orchestration is executable against fake ports while retaining
  context and canvas failure isolation and required reply error behavior.

## Open Questions

- Prompt versioning, streaming, context budgets, and canvas artifact contracts
  require separate evidence and are not part of this refactor stage.
