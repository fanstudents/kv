---
schema_version: behavior-contract/v1
id: kv.meeting.lifecycle-log.compatibility
title: Meeting Turn and Realtime Usage Logging Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Meeting lifecycle request coercion and logging orchestration from transport routes.
  non_goals:
    - Change Meeting UI, WebRTC, audio, or recording behavior.
    - Change meeting_turns or ai_usage_logs row formats.
    - Add retries, deduplication, migrations, or provider calls.
---

# Meeting Turn and Realtime Usage Logging Compatibility

## Behavior Boundary

The rules modules coerce the existing JSON payloads. The application modules
own validation, legacy failure boundaries, and port invocation. Legacy adapters
keep the existing `appendTurns` and `logRealtimeUsage` helper calls. Routes only
parse JSON, bind the legacy adapter, and map the existing HTTP responses.

## Invariants

1. Invalid JSON is treated as an empty object by the route.
2. log-turn keeps string `meetingId`, trims string `content`, accepts only
   `agent`/`teamlead` roles, and defaults all other roles to `boss`.
3. log-turn rejects an empty meeting ID or content with the existing 400 error
   `缺少 meetingId 或 content`.
4. A valid log-turn appends exactly one turn with the existing optional
   `agentSlug` and `speaker` fields; persistence failure is non-blocking and
   still returns `{ ok: true }`.
5. log-usage keeps string `model`, optional string `agentSlug`, and any JSON
   object usage payload; null or non-object usage becomes `{}`.
6. log-usage rejects an empty model with the existing 400 error `缺少 model`.
7. A valid log-usage call passes the payload to the legacy helper unchanged;
   the route does not add a new catch boundary around provider failures.
8. No module changes database schemas, row formats, UI output, or browser
   interaction contracts.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/meeting-log-rules.test.ts
    - tests/unit/meeting-log-legacy-adapters.test.ts
    - tests/unit/meeting-log-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the new rules, ports, adapters, and applications only to the
  two lifecycle routes; `appendTurns` remains shared with Meeting command.
- Full verification at `526382a`: 43 Vitest files / 285 tests, 93-page
  production build, 130 Playwright smoke cases, and identical Chrome catalog
  DOM before/after.

## Intentional Changes

- Meeting lifecycle payload coercion and logging failure boundaries become
  Meeting-owned, unit-tested functions.
- Storage and usage helpers are behind provider-neutral ports with legacy
  adapters; no existing helper arguments or row shapes change.
