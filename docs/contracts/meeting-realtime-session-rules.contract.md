---
schema_version: behavior-contract/v1
id: kv.meeting.realtime-session.rules
title: Meeting Realtime Session Request Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate deterministic realtime-session request and active-Agent decisions from the route.
  non_goals:
    - Change WebRTC, OpenAI realtime token, audio, or Meeting UI behavior.
    - Change live/demo context, history, voice default, or response copy.
    - Change database rows, migrations, retries, or provider endpoints.
---

# Meeting Realtime Session Request Compatibility

## Behavior Boundary

In scope is coercing the request body, applying the existing `alloy` voice and
demo defaults, and selecting an active Agent. History loading, context source,
OpenAI token minting, HTTP mapping, and the browser's WebRTC flow remain outside
the pure module during this stage.

The Meeting-owned ports also describe history, demo/live context, and token
minting capabilities. The legacy adapter preserves the existing helper calls
and realtime token configuration.

## Invariants

1. `slug` and `meetingId` accept strings; non-strings become empty strings.
2. `voice` accepts a string; non-strings become `alloy`.
3. `demo` is true only when the request value is exactly `true`.
4. Agent selection requires the requested slug and `active` status.
5. Display name remains `${personEn} ${personZh}`.
6. Missing/inactive Agent retains the route's 404 response.
7. The pure module performs no provider, storage, environment, or browser I/O.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/meeting-realtime-session-rules.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `mintRealtimeSession` and `getAgentDemoContext` only to the
  realtime-session route and their existing helper files.
- `getAgentLiveContext` and `getRecentHistory` have other Meeting/Agent chat
  consumers, so this stage does not move or alter either helper.

## Intentional Changes

- Realtime-session request coercion, active-Agent selection, and display mapping
  become Meeting-owned pure functions.
- The route delegates these decisions while retaining all context, history,
  token, and HTTP behavior.
