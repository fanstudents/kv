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
| `f8c5992` | Checklist read boundary | Checklist projection port and HTTP-preserving cutover |
| `c88c47f` | Subscribers read boundary | Subscriber query port, ordering, and HTTP-preserving cutover |
| `698ffd0` | Agent status read boundary | Static registry fallback, enabled override, and HTTP-preserving cutover |
| `4f3c8aa` | Checklist update boundary | PATCH coercion, timestamped upsert port, and HTTP-preserving cutover |
| `78d5ce2` | Subscribers update boundary | PATCH field filtering, update port, and HTTP-preserving cutover |
| `dd14d67` | Knowledge access update boundary | Catalog/level validation, access port, and HTTP-preserving cutover |
| `8c12d78` | Goals update boundary | Goal payload validation, upsert port, and HTTP-preserving cutover |
| `24ce542` | Goals read boundary | Goal list port, default-seed preservation, and HTTP-preserving cutover |
| `b3f33ae` | Goals delete boundary | Query-id validation, delete port, and HTTP-preserving cutover |
| `edcd8c9` | Goals reset boundary | Default-goal reset port and HTTP-preserving cutover |
| `cafa912` | Auth login boundary | Password parsing, auth decision port, and cookie-preserving cutover |

## Current Verification

At `cafa912` plus this documentation stage:

- `npm run verify:full` passed;
- 104 Vitest files / 408 tests passed;
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
- CodeGraph maps `runChecklistRead`, `ChecklistReadPort`, and
  `createLegacyChecklistReadAdapter` through the Checklist module, adapter, and
  route; the existing `checklist_status` projection remains behind the adapter;
- CodeGraph maps `runSubscribersRead`, `SubscribersReadPort`, and
  `createLegacySubscribersReadAdapter` through the Subscribers module, adapter,
  and route; the existing `line_subscribers` query remains behind the adapter;
- CodeGraph maps `buildAgentStatusMap`, `runAgentStatusRead`, and
  `createLegacyAgentStatusReadAdapter` through the Agents module, adapter, and
  route; the existing `AGENTS` fallback and `line_agents` query remain explicit;
- CodeGraph maps `parseChecklistUpdateRequest`, `runChecklistUpdate`, and
  `createLegacyChecklistUpdateAdapter` through the Checklist update modules,
  adapter, and `[id]` route; the existing `checklist_status` write remains
  behind the adapter;
- CodeGraph maps `parseSubscribersUpdateRequest`, `runSubscribersUpdate`, and
  `createLegacySubscribersUpdateAdapter` through the Subscribers update
  modules, adapter, and `[id]` route; the existing `line_subscribers` write
  remains behind the adapter;
- CodeGraph maps `parseKnowledgeAccessUpdateRequest`,
  `runKnowledgeAccessUpdate`, and
  `createLegacyKnowledgeAccessUpdateAdapter` through the Knowledge Base access
  modules, adapter, and route; the existing `setAgentAccess` helper remains
  behind the adapter;
- CodeGraph maps `parseGoalUpdateRequest`, `runGoalUpdate`, and
  `createLegacyGoalUpdateAdapter` through the Goals update modules, adapter,
  and route; the existing `upsertGoal` helper remains behind the adapter;
- CodeGraph maps `runGoalsRead`, `GoalsReadPort`, and
  `createLegacyGoalsReadAdapter` through the Goals read modules, adapter, and
  route; the existing `listGoals` helper remains behind the adapter;
- CodeGraph maps `parseGoalDeleteRequest`, `runGoalDelete`, and
  `createLegacyGoalDeleteAdapter` through the Goals delete modules, adapter,
  and route; the existing `deleteGoal` helper remains behind the adapter;
- CodeGraph maps `runGoalsReset`, `GoalsResetPort`, and
  `createLegacyGoalsResetAdapter` through the Goals reset modules, adapter, and
  route; the existing `resetGoalsToDefault` helper remains behind the adapter;
- CodeGraph maps `parseLoginRequest`, `runLogin`, and
  `createLegacyLoginAdapter` through the Auth login modules, adapter, and
  route; the existing password/session helpers remain behind the adapter;
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

### WP6-Q Checklist read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/checklist-read.contract.md`.
- `src/modules/checklist/read-application.ts` owns query-error mapping while
  returning raw rows. `src/adapters/checklist/legacy-read-adapter.ts` keeps the
  exact `checklist_status` `item_id, done` projection with no new filters or
  ordering.
- The route preserves HTTP 400 error mapping and raw success data; Todos UI,
  checklist PATCH behavior, row formats, retention, and schema/data behavior
  are untouched.
- Checkpoint: `f8c5992`.
- Full verification: 77 Vitest files / 366 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Checklist
  port, application, adapter, and route.
- Checklist schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-R Subscribers read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/subscribers-read.contract.md`.
- `src/modules/subscribers/read-application.ts` owns query-error mapping while
  returning raw rows. `src/adapters/subscribers/legacy-read-adapter.ts` keeps
  the exact `line_subscribers` `select("*")` and descending `last_seen_at`
  ordering.
- The route preserves HTTP 400 error mapping and raw success data; Subscribers
  UI, PATCH/broadcast/relay writers, row formats, retention, and schema/data
  behavior are untouched.
- Checkpoint: `c88c47f`.
- Full verification: 79 Vitest files / 369 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Subscribers
  port, application, adapter, and route.
- Subscribers schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-S Agent status read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/agent-status-read.contract.md`.
- `src/modules/agents/status-rules.ts` preserves the static-catalog merge,
  Boolean coercion, and unknown-slug behavior. `status-read-application.ts`
  owns provider-throw fallback, while
  `src/adapters/agents/legacy-status-read-adapter.ts` keeps the exact
  `line_agents` `slug,enabled` query.
- The route preserves `{ enabled }`; Sidebar, Dashboard, TV, registry data,
  writes, and schema/data behavior are untouched.
- Checkpoint: `698ffd0`.
- Full verification: 82 Vitest files / 374 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Agent
  status rules, port, application, adapter, and route.
- Agent registry/schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-T Checklist update compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/checklist-update.contract.md`.
- `src/modules/checklist/update-rules.ts` preserves body/id coercion;
  `update-application.ts` owns ISO timestamp creation and provider-result
  mapping; `src/adapters/checklist/legacy-update-adapter.ts` keeps the exact
  upsert/select/single chain.
- The route preserves HTTP 400 error mapping and raw success data; Todos UI,
  optimistic state, row formats, retention, and schema/data behavior are
  untouched.
- Checkpoint: `4f3c8aa`.
- Full verification: 85 Vitest files / 379 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Checklist
  update rules, port, application, adapter, and `[id]` route.
- Checklist schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-U Subscribers update compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/subscribers-update.contract.md`.
- `src/modules/subscribers/update-rules.ts` preserves recognized-field
  filtering; `update-application.ts` owns invalid-input and provider-result
  mapping; `src/adapters/subscribers/legacy-update-adapter.ts` keeps the exact
  update/equality/select/single chain.
- The route preserves HTTP 400 error mapping and raw success data for
  Subscribers; UI, broadcast/relay behavior, row formats, retention, and
  schema/data behavior are untouched.
- Checkpoint: `78d5ce2`.
- Full verification: 88 Vitest files / 384 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Subscribers
  update rules, port, application, adapter, and `[id]` route.
- Subscribers schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-V Knowledge access update compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-access-update.contract.md`.
- `src/modules/knowledge-base/access-rules.ts` preserves catalog membership and
  level coercion; `access-application.ts` owns invalid-input branching;
  `src/adapters/knowledge-base/legacy-access-update-adapter.ts` keeps the
  existing `setAgentAccess` helper behind the access port.
- The route preserves HTTP 400 validation, `{ ok: true }` success, and existing
  provider exception behavior; Knowledge Base UI, Agent context reads, row
  formats, retention, and schema/data behavior are untouched.
- Checkpoint: `dd14d67`.
- Full verification: 91 Vitest files / 389 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Knowledge
  Base access rules, port, application, adapter, and route.
- Knowledge access schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-W Goals update compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/goals-update.contract.md`.
- `src/modules/goals/update-rules.ts` preserves catalog validation, coercion,
  date fallback, and `AgentGoal` assembly; `update-application.ts` owns
  provider invocation and error mapping;
  `src/adapters/goals/legacy-update-adapter.ts` keeps the existing `upsertGoal`
  helper behind the update port.
- The route preserves HTTP 400 validation, raw goal success, HTTP 500 provider
  errors, and existing Goals UI/cache/progress behavior; row formats, retention,
  and schema/data behavior are untouched.
- Checkpoint: `8c12d78`.
- Full verification: 94 Vitest files / 394 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Goals
  update rules, port, application, adapter, and route.
- Goals schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-X Goals read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/goals-read.contract.md`.
- `src/modules/goals/read-application.ts` owns the provider-neutral list
  boundary; `src/adapters/goals/legacy-read-adapter.ts` keeps the existing
  `listGoals` helper, including default seeding and row mapping.
- The route preserves the `{ goals }` response envelope, default data, ordering,
  and existing provider exception behavior; Goals UI/cache, row formats,
  retention, and schema/data behavior are untouched.
- Checkpoint: `24ce542`.
- Full verification: 96 Vitest files / 396 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Goals read
  port, application, adapter, and route.
- Goals schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-Y Goals delete compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/goals-delete.contract.md`.
- `src/modules/goals/delete-rules.ts` preserves query-id validation;
  `delete-application.ts` owns provider invocation;
  `src/adapters/goals/legacy-delete-adapter.ts` keeps the existing `deleteGoal`
  helper behind the delete port.
- The route preserves HTTP 400 validation, `{ ok: true }` success, and existing
  provider exception behavior; Goals UI/cache, row formats, retention, and
  schema/data behavior are untouched.
- Checkpoint: `b3f33ae`.
- Full verification: 99 Vitest files / 401 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Goals
  delete rules, port, application, adapter, and route.
- Goals schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-Z Goals reset compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/goals-reset.contract.md`.
- `src/modules/goals/reset-application.ts` owns the provider-neutral reset
  boundary; `src/adapters/goals/legacy-reset-adapter.ts` keeps the existing
  `resetGoalsToDefault` helper, including default-goal persistence semantics.
- The route preserves the `{ goals }` response envelope, default values, and
  existing provider exception behavior; Goals UI/cache, row formats, retention,
  and schema/data behavior are untouched.
- Checkpoint: `edcd8c9`.
- Full verification: 101 Vitest files / 403 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Goals reset
  port, application, adapter, and route.
- Goals schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-AA Auth login compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/auth-login.contract.md`.
- `src/modules/auth/login-rules.ts` owns password input normalization;
  `login-application.ts` owns configured/invalid/success decisions;
  `src/adapters/auth/legacy-login-adapter.ts` keeps the existing environment
  checks and auth helpers behind the login port.
- The route preserves HTTP 500 configuration errors, HTTP 401 password errors,
  successful `{ ok: true }`, and the existing `kv_session` cookie attributes;
  login UI, middleware, token format, and data behavior are untouched.
- Checkpoint: `cafa912`.
- Full verification: 104 Vitest files / 408 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the Auth login
  rules, port, application, adapter, and route.
- Auth provider migration and production traffic evidence remain deferred.

### WP6-AB Auth logout compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/auth-logout.contract.md`.
- `src/modules/auth/logout-rules.ts` owns the provider-neutral cookie-expiration
  policy; `logout-application.ts` returns the policy to the route without
  introducing an empty provider adapter.
- The `/api/auth/logout` route preserves `{ ok: true }`, the empty
  `kv_session` value, `maxAge: 0`, `httpOnly`, `sameSite: "lax"`, `/` path,
  and environment-sensitive `secure`; login UI, middleware, token format, and
  data behavior are untouched.
- Checkpoint: `08dd6ee`.
- Full verification: 106 Vitest files / 411 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the logout
  rules, application, and route.
- Auth/session ownership changes and production traffic evidence remain
  deferred.

### WP6-AC Integration status compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/integrations-status.contract.md`.
- `src/modules/integrations/status-ports.ts` defines the provider-neutral map
  and read port; `status-application.ts` owns the application boundary;
  `src/adapters/integrations/legacy-status-adapter.ts` keeps the existing
  aggregator, Google probe, environment checks, and cache behind the port.
- The `/api/integrations/status` route preserves the existing status keys,
  `connected`/`detail` entries, provider fallback behavior, and JSON response;
  Integrations, Agent, Universe, and Connection Status UI are untouched.
- Checkpoint: `f89265d`.
- Full verification: 108 Vitest files / 413 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the status
  port, application, adapter, and route.
- Provider migration and production traffic evidence remain deferred.

### WP6-AD Knowledge Base read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-read.contract.md`.
- `src/modules/knowledge-base/read-rules.ts` preserves status/source filters;
  `read-application.ts` owns the parallel `{ docs, access }` aggregation;
  `src/adapters/knowledge-base/legacy-read-adapter.ts` keeps
  `listKnowledgeDocs` and `listAgentAccess` behind the port.
- The `/api/knowledge-base` GET route preserves the response envelope,
  recognized filters, document ordering/mapping, Agent access defaults, and
  existing provider behavior; Knowledge Base and related UI are untouched.
- Checkpoint: `13fe0c2`.
- Full verification: 111 Vitest files / 417 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the read
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-AE Knowledge Base create compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-create.contract.md`.
- `src/modules/knowledge-base/create-rules.ts` owns title/level validation,
  trimming, defaults, and shared kind/status values;
  `create-application.ts` owns the create boundary;
  `src/adapters/knowledge-base/legacy-create-adapter.ts` keeps
  `addKnowledgeDoc` behind the port.
- The `/api/knowledge-base` POST route preserves HTTP 400 validation, default
  category/kind/status, created document response, and existing persistence
  behavior; Knowledge Base UI, row formats, and schema/data behavior are
  untouched.
- Checkpoint: `a4a9a70`.
- Full verification: 114 Vitest files / 421 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the create
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-AF Knowledge Base update compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-update.contract.md`.
- `src/modules/knowledge-base/update-rules.ts` preserves id/level/status/kind
  validation and field coercion; `update-application.ts` owns success,
  not-found, and provider-error mapping;
  `src/adapters/knowledge-base/legacy-update-adapter.ts` keeps
  `updateKnowledgeDoc` behind the port.
- The `/api/knowledge-base` PATCH route preserves HTTP 400/404 mappings,
  success document JSON, content/owner/reviewAt semantics, version/indexing,
  and existing provider behavior; Knowledge Base UI and data formats are
  untouched.
- Checkpoint: `a4df682`.
- Full verification: 117 Vitest files / 426 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the update
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

## Current Boundary

Safe TypeScript, compatibility, provider-port, and route strangler work may
continue against the existing row formats. Database migrations, repository
cutover, and real canary traffic remain deferred until an authorized
production-like schema export and provider environment are available.
