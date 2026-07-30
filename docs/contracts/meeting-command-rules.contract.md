---
schema_version: behavior-contract/v1
id: kv.meeting.command.rules
title: Meeting Command Request And Roster Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate deterministic Meeting command input and roster decisions from the route.
  non_goals:
    - Change Meeting UI, audio flow, prompts, provider calls, or persistence.
    - Change Team Lead, responder, target-Agent, or display-name behavior.
    - Change HTTP status codes, response copy, or meeting row formats.
    - Add migrations, retries, streaming, or real provider calls.
---

# Meeting Command Request And Roster Compatibility

## Behavior Boundary

In scope is coercing the decoded Meeting command body, selecting the existing
Team Lead and active responders, and mapping catalog metadata to the existing
provider input shape. History loading, OpenAI generation, turn persistence,
response mapping, and the realtime session route remain outside this stage.

## Consumers And Entrypoints

- `POST /api/meeting/command`
- `src/modules/meeting/command-rules.ts`
- `src/modules/meeting/command-ports.ts`
- `src/modules/meeting/command-application.ts#runMeetingCommand`
- `src/adapters/meeting/legacy-command-adapter.ts`
- Existing `runMeetingRound`, `replyAsAgent`, `getRecentHistory`, and
  `appendTurns` integrations remain unchanged.

## Invariants

1. `meetingId` and trimmed `command` must be non-empty strings.
2. `targetSlug` remains an untrimmed string or the empty string.
3. Team Lead selection uses the existing `teamlead` slug without requiring an
   active status.
4. Batch responders preserve catalog order, include active agents only, and
   exclude Team Lead.
5. Target selection requires the requested slug to be active.
6. Display names remain `${personEn} ${personZh}`.
7. Empty one-to-one replies keep the existing fallback copy.
8. No provider, database, environment, or browser I/O occurs in the module.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/meeting-command-rules.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `runMeetingRound` and `replyAsAgent` only to
  `src/app/api/meeting/command/route.ts` and `src/lib/openai.ts`.
- `getRecentHistory` is shared by Meeting command and realtime session; this
  stage does not move or alter that helper.

## Intentional Changes

- Deterministic request, roster, display-name, and empty-reply decisions become
  Meeting-owned pure functions.
- The route delegates those decisions while retaining all provider, storage,
  failure-isolation, and HTTP behavior.
- Meeting-owned ports describe history, one-to-one reply, batch round, and turn
  persistence capabilities. The legacy adapter preserves the existing OpenAI
  and meeting-store calls and row shapes.
- Application orchestration is executable against fake ports while preserving
  history and turn-write failure isolation, one-to-one and batch response
  shapes, and existing HTTP result categories.
