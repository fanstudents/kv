---
schema_version: behavior-contract/v1
id: kv.support.log-reply.compatibility
title: Support Log Reply Compatibility
status: active
owner_surface: callback
change_context:
  type: refactor
  reason: Separate Support callback payload coercion and conversation logging from the transport route.
  non_goals:
    - Change the callback secret gate or external caller contract.
    - Change line_support_conversations row formats or Support LINE relay behavior.
    - Add migrations, retries, or delivery policy changes.
---

# Support Log Reply Compatibility

## Behavior Boundary

The route retains the existing secret gate and GET health response. The rules
module owns JSON payload coercion; the application module owns required-field
validation and conversation-write failure mapping. The legacy adapter fixes the
existing `bot` role and calls `logConversationMessage`.

## Invariants

1. GET still returns `{ ok: true, service: "support-log-reply" }`.
2. POST still returns 500 when `SUPPORT_LOG_SECRET` is unset, 401 for a
   mismatched `x-log-secret`, and treats malformed JSON as an empty object.
3. `userId` and `text` remain string-only, are not trimmed, and missing values
   return `缺少 userId 或 text` (400).
4. A valid callback writes `(userId, "bot", text)` through the existing
   conversation helper and returns `{ ok: true }`; helper errors map to their
   existing message and 502, with non-Error throws falling back to `寫入失敗`.
5. No UI, LINE relay, conversation row/schema, or external secret behavior
   changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/support-log-reply-rules.test.ts
    - tests/unit/support-log-reply-application.test.ts
    - tests/unit/support-log-reply-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the rules, application, port, adapter, and route as a single
  Support callback boundary; the existing conversation helper remains shared
  with the Support LINE relay adapter.
- Full verification at `8b6af78` plus this checkpoint: 55 Vitest files / 325
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  callback cutover.

## Intentional Changes

- Support callback payload coercion and logging failure mapping are now
  Support-owned, unit-tested functions.
- The existing callback secret and `line_support_conversations` write remain
  compatibility boundaries; no database or external caller change is made.
