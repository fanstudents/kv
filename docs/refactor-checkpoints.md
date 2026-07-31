# Productization Refactor Checkpoints

This file is the repository-local handoff ledger for the productization
refactor. The external canonical plan remains
`D:/_CabLate_Agents/coder/projects/kv/productization-plan.md`.

## Execution Rule

Every stage must:

1. capture a real Chrome UI baseline before the change;
2. record CodeGraph and source-reference impact before the change;
3. preserve Dennis's current database, API, provider, and UI contracts unless
   an intentional change is separately approved;
4. run focused tests plus lint, route-aware typecheck, and production build;
5. capture Chrome and CodeGraph evidence after the change;
6. create a checkpoint commit before starting the next stage.

## Checkpoints

| Commit | Stage | Evidence |
|---|---|---|
| `657b08f` | Productization baseline and Visit Runtime | WP0/WP1 contracts, characterization, Runtime Kernel, Visit pure core |
| `e870d87` | Visit rollout application boundary | Legacy default, record-only shadow evaluation |
| `c381d1e` | Visit LINE input normalization | Pure inbound payload normalization |
| `913587c` | Visit text classifier adoption | Existing decision precedence preserved |
| `03b28b6` | Visit webhook dispatch normalization | Existing handlers and unknown-user fallback preserved |
| `e45fd67` | Visit contact persistence mapping | Exact legacy `contacts` insert shape |
| `1e2105a` | Visit invite persistence mapping | Exact legacy `pending_invites` insert shape |
| `cdcb98a` | Visit offer resolution mapping | Accepted/declined/timeout legacy vocabulary preserved |
| `8de2f39` | Visit approval write mapping | Status-only and revision-only patches |
| `f7feda9` | Visit public response write mapping | Compare-and-set confirmation and fulfilment patches |
| `4657680` | Visit public response rules | Choice, location, and slot selection pure logic |
| `7efd8de` | Visit provider port | Visit-owned provider contract and legacy OpenAI/Google adapter |
| `0a0b60c` | Orders inbound normalization | Existing Teachify order and enrollment payload coercion |
| `1b5b2b4` | Orders notification plan | Exact enablement, recipient, copy, title, accent, and activity rules |
| `aadaae3` | Orders legacy adapters | Existing Supabase rows, selector, LINE delivery, and activity writes |
| `06597b8` | Orders application flow | Normalize, persist, configure, plan, deliver, and record orchestration |
| `58a53e7` | Reporting deterministic rules | Settings, rolling window, filtering, grouping, copy, and AI fallback |
| `8db06d3` | Reporting legacy adapters | Existing Supabase, OpenAI, LINE, usage, and roster implementations |
| `e403819` | Reporting application flow | Config, query, preparation, summary, delivery, and activity orchestration |
| `7447a32` | Support reporting rules | Customer identity, grouping, truncation, copy, and AI fallback |
| `3d403b4` | Support reporting adapters | Existing Supabase, OpenAI, LINE, and usage implementations |
| `d6a0821` | Support reporting application | Config, messages, names, summary, delivery, and activity orchestration |
| `97157f4` | Support relay inbound rules | Exact LINE payload parsing, text-event filtering, and capture planning |
| `805ac0e` | Support relay legacy adapters | Raw relay transport and existing activity, subscriber, and conversation writes |
| `52758ac` | Support relay application | Concurrent relay and isolated side-channel capture orchestration |
| `515f7d9` | Agent chat deterministic rules | Exact request coercion and empty-reply fallback |
| `956fb01` | Agent chat legacy adapters | Catalog identity, context, OpenAI reply, and canvas provider ports |
| `3acdad6` | Agent chat application | Context/reply/canvas orchestration and existing failure isolation |
| `cda34a3` | Meeting command deterministic rules | Request coercion, roster selection, display mapping, and fallback |
| `c8a5763` | Meeting command legacy adapters | History, OpenAI round/reply, and turn persistence ports |
| `4027383` | Meeting command application | Batch/one-to-one orchestration and persistence failure isolation |
| `761974a` | Meeting realtime-session deterministic rules | Request coercion, active-Agent selection, profile mapping, and defaults |
| `c063d9b` | Meeting realtime-session provider ports | History, demo/live context, and opaque token provider ports with legacy adapter |
| `50e1f38` | Meeting realtime-session application | Session orchestration, context fallback, and provider error mapping |
| `a63cd6f` | Meeting lifecycle request rules | log-turn and log-usage coercion, trimming, and defaults |
| `e7778a6` | Meeting lifecycle ports | Turn persistence and realtime usage legacy adapters |
| `526382a` | Meeting lifecycle application | Validation, persistence failure isolation, and HTTP-preserving cutover |
| `4f9fa4e` | Meeting storage request rules | start JSON, finish multipart, recording query, and audio descriptor rules |
| `c16dd4c` | Meeting storage ports | Meeting creation, finish/upload, and signed-recording legacy adapters |
| `1dbfebb` | Meeting storage application | Start/finish/recording orchestration and HTTP-preserving cutover |
| `3d47695` | Meeting audio request rules | speak defaults, text coercion, multipart audio, and prompt hint rules |
| `b20b886` | Meeting audio provider ports | OpenAI TTS/transcription legacy adapters behind provider ports |
| `508d0b9` | Meeting audio application | Speak/transcribe validation, provider failure mapping, and HTTP-preserving cutover |
| `13daf2d` | AI usage read boundary | Usage aggregation, budget lookup port, and HTTP-preserving read cutover |
| `8b6af78` | Support log-reply boundary | Callback payload rules, bot conversation port, and HTTP-preserving cutover |
| `1bb02b4` | Live Task image boundary | Data URL parsing, image lookup port, and HTTP-preserving cutover |
| `6dda162` | Live Task update boundary | POST payload rules, state update port, and HTTP-preserving cutover |
| `fa309ba` | Live Task read boundary | State/run-step composition, read port, and HTTP-preserving cutover |
| `6b9eef5` | Live Task history boundary | Visit history query ports, outcome mapping, and HTTP-preserving cutover |
| `9925600` | Activity read boundary | Query coercion, activity read port, and HTTP-preserving cutover |
| `8025673` | Shared activity read boundary | Reuse activity read port for general and agent-scoped activity routes |
| `75501b2` | Goals history boundary | Trend query coercion, metric reader port, and HTTP-preserving cutover |
| `84cca97` | Contacts read boundary | Nested contact/offers/invites query port and HTTP-preserving cutover |

## Current Verification

At `84cca97` plus this documentation stage:

- `npm run verify:full` passed;
- 75 Vitest files / 363 tests passed;
- production build generated 93 pages;
- 130 Playwright smoke cases passed;
- Chrome retained the Agent catalog count and tier labels before and after the
  Contacts read cutover; reload-only Next.js development-tool nodes were
  normalized out of the snapshot comparison;
- CodeGraph maps `processOrderPayload`, `OrdersPorts`, and
  `createLegacyOrdersAdapters` only through the Orders module, legacy adapter,
  and Teachify route;
- CodeGraph maps `runDailyTeamLeadReport`, `ReportingClock`, `ReportingPorts`,
  and `createLegacyReportingAdapters` through the Reporting module, legacy
  adapter, and server compatibility facade;
- CodeGraph maps `runSupportReport`, `SupportReportClock`,
  `SupportReportPorts`, and `createLegacySupportReportAdapters` through the
  Support module, legacy adapter, and server compatibility facade;
- CodeGraph maps `parseSupportRelayPayload`, `processSupportRelay`, and
  `createLegacySupportRelayAdapters` only through the Support relay module,
  legacy adapter, and Support LINE webhook;
- CodeGraph maps `parseAgentChatRequest`, `runAgentChat`, and
  `createLegacyAgentChatAdapters` only through the Agent chat module, legacy
  adapter, and `src/app/api/agent-chat/route.ts`; `getAgentLiveContext` remains
  shared with Meeting realtime through the existing helper;
- CodeGraph maps `parseMeetingCommandRequest`, `runMeetingCommand`, and
  `createLegacyMeetingCommandAdapter` only through the Meeting command module,
  legacy adapter, and `src/app/api/meeting/command/route.ts`; `getRecentHistory`
  remains shared with Meeting realtime;
- CodeGraph maps `parseRealtimeSessionRequest`, `findActiveRealtimeAgent`, and
  `toRealtimeAgentProfile` only through the realtime-session rules module and
  `src/app/api/meeting/realtime-session/route.ts`;
- CodeGraph maps `RealtimeSessionPorts` and
  `createLegacyRealtimeSessionAdapter` through the Meeting realtime module,
  legacy adapter, and realtime-session route; `getRecentHistory` remains shared
  with Meeting command and `getAgentLiveContext` remains shared with Agent chat;
- CodeGraph maps `runRealtimeSession` through the realtime-session application
  module and `src/app/api/meeting/realtime-session/route.ts`; the route retains
  only transport parsing, catalog binding, and HTTP result mapping;
- CodeGraph maps `parseMeetingTurnLogRequest`, `runMeetingTurnLog`, and
  `createLegacyMeetingTurnLogAdapter` only through the log-turn module, adapter,
  and `src/app/api/meeting/log-turn/route.ts`; `appendTurns` remains shared with
  Meeting command;
- CodeGraph maps `parseMeetingRealtimeUsageLogRequest`,
  `runMeetingRealtimeUsageLog`, and
  `createLegacyMeetingRealtimeUsageAdapter` only through the log-usage module,
  adapter, and `src/app/api/meeting/log-usage/route.ts`; `logRealtimeUsage`
  retains its existing helper owner;
- CodeGraph maps `parseMeetingStartRequest`/`runMeetingStart`,
  `parseMeetingFinishForm`/`runMeetingFinish`, and
  `parseMeetingRecordingRequest`/`runMeetingRecording` through their respective
  Meeting modules and routes; legacy adapters are the only callers of
  `createMeeting`, `finishMeeting`, `uploadRecording`, and
  `getSignedRecordingUrl` in the new boundary;
- CodeGraph maps `parseMeetingSpeakRequest`/`runMeetingSpeak` and
  `parseMeetingTranscribeForm`/`runMeetingTranscribe` through the audio modules
  and routes; `createLegacyMeetingSpeakAdapter` and
  `createLegacyMeetingTranscribeAdapter` remain the only new callers of the
  existing OpenAI audio helpers;
- CodeGraph maps `summarizeAiUsage`, `runAiUsageRead`, and
  `createLegacyAiUsageReadAdapter` through the AI usage rules/application,
  adapter, and route; the existing Supabase read and `budgetStatus` helper
  remain behind that adapter;
- CodeGraph maps `parseSupportLogReplyRequest`, `runSupportLogReply`, and
  `createLegacySupportLogReplyAdapter` through the Support callback modules and
  route; `logConversationMessage` remains shared with the Support LINE relay;
- CodeGraph maps `parseLiveTaskImageDataUrl`, `runLiveTaskImage`, and
  `createLegacyLiveTaskImageAdapter` through the Live Task image modules and
  route; the existing `getLiveImage` helper remains behind the adapter;
- CodeGraph maps `parseLiveTaskUpdateRequest`, `runLiveTaskUpdate`, and
  `createLegacyLiveTaskUpdateAdapter` through the Live Task update modules and
  route; `setLiveTask` remains shared with existing Visit, LINE, and cron
  callers;
- CodeGraph maps `parseLiveTaskReadRequest`, `runLiveTaskRead`, and
  `createLegacyLiveTaskReadAdapter` through the Live Task read modules and
  route; `getLiveTaskState` and `currentStep` remain behind the adapter;
- CodeGraph maps `parseLiveTaskHistoryRequest`, `summarizeLiveTaskHistory`,
  `runLiveTaskHistory`, and `createLegacyLiveTaskHistoryAdapter` through the
  Live Task history modules and route; the shared `getSupabase` helper remains
  behind the legacy adapter;
- CodeGraph maps `parseActivityReadRequest`, `runActivityRead`, and
  `createLegacyActivityReadAdapter` through the Activity module, adapter, and
  route; `getSupabase` remains behind the legacy read adapter;
- CodeGraph maps `parseAgentActivityReadRequest`, `runActivityRead`, and
  `createLegacyActivityReadAdapter` through the same Activity module and the
  agent-scoped route; the general activity route continues to share that port;
- CodeGraph maps `parseGoalsHistoryRequest`, `runGoalsHistory`, and
  `createLegacyGoalsHistoryAdapter` through the Goals history module, adapter,
  and route; the existing `metricHistory` helper remains behind the adapter;
- CodeGraph maps `runContactsRead`, `ContactsReadPort`, and
  `createLegacyContactsReadAdapter` through the Contacts module, adapter, and
  route; the existing nested Supabase read remains behind the adapter;
- no production Supabase schema or data was read or changed.

### WP6-P Contacts read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/contacts-read.contract.md`.
- `src/modules/contacts/read-application.ts` owns query-error mapping while
  returning raw nested rows. `src/adapters/contacts/legacy-read-adapter.ts`
  keeps the exact `contacts` nested `visit_offers`/`pending_invites` select and
  descending `created_at` ordering.
- The route preserves HTTP 400 error mapping and raw success data; Outputs UI,
  contact/offer/invite writers, row formats, retention, and schema/data behavior
  are untouched.
- Checkpoint: `84cca97`.
- Full verification: 75 Vitest files / 363 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Contacts
  port, application, adapter, and route.
- Contacts schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

## Current Boundary

Safe TypeScript, compatibility, provider-port, and route strangler work may
continue against the existing row formats. Database migrations, repository
cutover, and real canary traffic remain deferred until an authorized
production-like schema export and provider environment are available.
