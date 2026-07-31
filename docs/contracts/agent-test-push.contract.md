---
schema_version: behavior-contract/v1
id: kv.agent-test-push.compatibility
title: Agent Test Push Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Agent test-push input mapping, delivery orchestration, and legacy LINE/activity side effects from the dynamic route.
  non_goals:
    - Change LINE message styles, channel credentials, activity vocabulary, response envelope, or Agent UI.
    - Change the existing line_agent_activity row shape or introduce a new persistence schema.
    - Add a provider migration, credential rotation, message-template redesign, or production traffic switch.
---

# Agent Test Push Compatibility

## Behavior Boundary

The rules module owns the existing request defaults, validation messages, style
labels, and support-channel routing. The application module owns delivery
error mapping and ordered activity recording. The legacy adapter keeps the
existing `buildPushMessages`, `pushLineRawMessages`, and
`line_agent_activity` operations behind a provider-neutral port. The route
retains JSON parsing and HTTP response mapping.

## Invariants

1. `to` is trimmed and required; missing/blank `to` returns HTTP 400 with
   `缺少測試對象 LINE User ID`.
2. `text` is required without additional normalization; missing/empty `text`
   returns HTTP 400 with `缺少要推播的訊息內容`.
3. Only `text`, `flex`, `confirm`, and `buttons` are accepted styles; an
   unknown style falls back to `text` and keeps the matching `純文字` label.
4. A missing or empty title falls back to `通知`; an accent that is not a
   six-digit hexadecimal color falls back to `#06C755`.
5. The `support` slug sends through the support LINE channel; every other slug
   uses the primary channel. Message construction and delivery still use the
   existing LINE helpers.
6. A successful delivery records
   `已透過 LINE Messaging API 送出測試推播（{styleLabel}樣式）` with status
   `success`, and returns `{ ok: true, activity }`.
7. A provider failure records
   `測試推播失敗（{styleLabel}）：{message}` with status `failed`, then returns
   HTTP 502 with the provider message (or `推播失敗` when unavailable).
8. Existing `line_agent_activity` rows, response data, API access behavior,
   schema assumptions, and Agent UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/agent-test-push-rules.test.ts
    - tests/unit/agent-test-push-application.test.ts
    - tests/unit/agent-test-push-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseAgentTestPushRequest`, `runAgentTestPush`,
  `createLegacyAgentTestPushAdapter`, and `AgentTestPushPort` only through the
  Agent `[slug]/test-push` POST route; the legacy LINE helpers remain behind
  the adapter.
- Full verification at `c955e80`: 152 Vitest files / 481 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  test-push boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Test-push parsing, delivery orchestration, activity mapping, and provider
  access are now independently testable and replaceable.
- Existing LINE behavior, channel selection, activity wording, response
  statuses, persistence assumptions, and UI behavior remain unchanged.
