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

At code checkpoint `116885b` plus documentation checkpoint `fdcd0f7`:

- `npm run verify:full` passed;
- 174 Vitest files / 527 tests passed;
- production build generated 93 pages;
- 130 Playwright smoke cases passed;
- Chrome retained the Agent catalog count and tier labels before and after the
  LINE webhook payload boundary; reload-only Next.js development-tool nodes were
  normalized out of the snapshot comparison;
- CodeGraph maps `parseVisitLineWebhookPayload` and the shared
  `LineInboundEvent` type through the LINE webhook route and inbound normalizer;
- The remaining CodeGraph bullets in this section are cumulative evidence from
  earlier compatibility boundaries, not a separate pending verification run;
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

### WP6-AG Knowledge Base delete compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-delete.contract.md`.
- `src/modules/knowledge-base/delete-rules.ts` owns id parsing;
  `delete-application.ts` preserves the provider outcome;
  `src/adapters/knowledge-base/legacy-delete-adapter.ts` keeps
  `removeKnowledgeDoc` behind the delete port.
- The `/api/knowledge-base` DELETE route preserves missing-id HTTP 400,
  built-in-document HTTP 409, not-found HTTP 404, successful `{ ok: true }`,
  provider exceptions, and all Knowledge Base UI/data formats.
- Checkpoint: `dea36ec`.
- Full verification: 120 Vitest files / 430 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the delete
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, write-owner migration, reconciliation, and
  production traffic evidence remain deferred.

### WP6-AH Knowledge Base reindex compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-reindex.contract.md`.
- `src/modules/knowledge-base/reindex-rules.ts` owns indexable-content
  selection; `reindex-application.ts` owns stats/reindex orchestration;
  `src/adapters/knowledge-base/legacy-reindex-adapter.ts` keeps
  `listKnowledgeDocs`, `indexDocs`, and `indexStats` behind the port.
- The `/api/knowledge-base/reindex` GET/POST routes preserve index stats,
  published/indexable/chunk counts, best-effort indexing, `maxDuration`, and
  all Knowledge Base UI/data formats.
- Checkpoint: `5d1c92e`.
- Full verification: 123 Vitest files / 434 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the reindex
  rules, port, application, adapter, and routes.
- Knowledge Base schema evolution, index write-owner migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AI Knowledge Base import read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-import-read.contract.md`.
- `src/modules/knowledge-base/import-read-rules.ts` owns sourceId branch
  parsing; `import-read-application.ts` owns source/draft response
  orchestration; `src/adapters/knowledge-base/legacy-import-read-adapter.ts`
  keeps `listKbSources` and draft-filtered `listKnowledgeDocs` behind the
  read port.
- The `/api/knowledge-base/import` GET route preserves `{ sources }` and
  `{ docs }`, exact draft/source filtering, source/document mapping,
  `maxDuration`, and all import UI/data formats. PDF POST, review PUT, and
  discard DELETE remain unchanged.
- Checkpoint: `ceb22b8`.
- Full verification: 126 Vitest files / 439 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the import
  read rules, port, application, adapter, and route.
- Knowledge Base schema evolution, import write-owner migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AJ Knowledge Base import publish compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-import-publish.contract.md`.
- `src/modules/knowledge-base/import-publish-rules.ts` owns string-id
  validation; `import-publish-application.ts` owns publish orchestration;
  `src/adapters/knowledge-base/legacy-import-publish-adapter.ts` keeps
  `publishKnowledgeDocs` (including indexing) behind the port.
- The `/api/knowledge-base/import` PUT route preserves HTTP 400 validation,
  `{ published: count }`, id order/format, status updates, indexing,
  `maxDuration`, and all import UI/data formats. PDF POST, read GET, and
  discard DELETE remain unchanged.
- Checkpoint: `4bae9ff`.
- Full verification: 129 Vitest files / 442 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the publish
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, import write-owner migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AK Knowledge Base import discard compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-import-discard.contract.md`.
- `src/modules/knowledge-base/import-discard-rules.ts` owns string-id
  filtering; `import-discard-application.ts` owns sequential removal and
  deleted counting; `src/adapters/knowledge-base/legacy-import-discard-adapter.ts`
  keeps `removeKnowledgeDoc` behind the discard port.
- The `/api/knowledge-base/import` DELETE route preserves input order,
  `{ removed: count }`, not-found/built-in non-counting, provider exceptions,
  `maxDuration`, and all import UI/data formats. PDF POST, read GET, and
  publish PUT remain unchanged.
- Checkpoint: `dfd748f`.
- Full verification: 132 Vitest files / 445 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the discard
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, import write-owner migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AL Knowledge Base import upload compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-import-upload.contract.md`.
- `src/modules/knowledge-base/import-upload-rules.ts` owns PDF extension and
  12MB validation; `import-upload-application.ts` owns delegation;
  `src/adapters/knowledge-base/legacy-import-upload-adapter.ts` keeps
  `importPdf` (checksum, extraction, AI conversion, drafts, and source status)
  behind the port.
- The `/api/knowledge-base/import` POST route preserves missing-file 400,
  non-PDF 400, over-size 413, successful import result JSON, provider errors,
  `maxDuration`, and all import UI/data formats. Read GET, publish PUT, and
  discard DELETE remain unchanged.
- Checkpoint: `18bbd87`.
- Full verification: 135 Vitest files / 449 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the upload
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, import write-owner migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AM Knowledge Base crawl preview compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-crawl-preview.contract.md`.
- `src/modules/knowledge-base/crawl-preview-rules.ts` owns URL and branch
  parsing; `crawl-preview-application.ts` owns credit/site orchestration;
  `src/adapters/knowledge-base/legacy-crawl-preview-adapter.ts` keeps
  `mapSite`, `getCreditUsage`, and quota classification behind the port.
- The `/api/knowledge-base/crawl` GET route preserves credit-only responses,
  HTTP(S) validation, the 200-link provider limit, first-30 response slice,
  quota 429/other-error 502 mapping, and all Knowledge Base UI/data formats.
  Crawl POST remains on the legacy import pipeline.
- Checkpoint: `d3a0858`.
- Full verification: 138 Vitest files / 455 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the preview
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, crawl import write-owner migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AN Knowledge Base crawl import compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-crawl-import.contract.md`.
- `src/modules/knowledge-base/crawl-import-rules.ts` owns URL/mode/limit
  parsing; `crawl-import-application.ts` owns import → draft/credit
  orchestration; `src/adapters/knowledge-base/legacy-crawl-import-adapter.ts`
  keeps `importUrl`, draft reads, credit usage, and quota classification
  behind the port.
- The `/api/knowledge-base/crawl` POST route preserves URL validation,
  single/site mode, 1..60 limit clamp, import result plus drafts/credit,
  quota 429/other-error 500 mapping, `maxDuration`, and all Knowledge Base
  UI/data formats. Crawl preview GET remains unchanged.
- Checkpoint: `1cec8b3`.
- Full verification: 141 Vitest files / 461 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the import
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, crawl import write-owner migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AO Knowledge Base recheck cron compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/knowledge-base-recheck.contract.md`.
- `src/modules/knowledge-base/recheck-rules.ts` owns fail-closed cron
  authorization; `recheck-application.ts` owns the fixed ten-source schedule
  and response envelope; `src/adapters/knowledge-base/legacy-recheck-adapter.ts`
  keeps `recheckUrlSources` behind the port.
- The `/api/cron/kb-recheck` GET route preserves missing-secret 503,
  mismatched-header 401, exact-secret authorization, limit `10`,
  `{ ok: true, checked, changed }`, `maxDuration`, and all Knowledge Base
  freshness side effects and data formats.
- Checkpoint: `aac9964`.
- Full verification: 144 Vitest files / 466 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the recheck
  rules, port, application, adapter, and route.
- Knowledge Base schema evolution, recheck write-owner migration,
  reconciliation, and production scheduler evidence remain deferred.

### WP6-AP Agent instance read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/agent-instance-read.contract.md`.
- `src/modules/agents/agent-instance-read-application.ts` owns the
  found/not-found outcome; `src/adapters/agents/legacy-agent-instance-read-adapter.ts`
  keeps the existing `line_agents` `select("*")` query and provider error
  text behind the read port.
- The `/api/agents/[slug]` GET route preserves exact slug filtering, full-row
  response, provider-error/fallback 404 mapping, and all Agent UI/data
  formats. PATCH and activity side effects remain unchanged.
- Checkpoint: `da248df`.
- Full verification: 146 Vitest files / 470 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the instance
  read port, application, adapter, and route.
- Agent schema evolution, instance write-owner migration, registry cutover,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AQ Agent instance update compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/agent-instance-update.contract.md`.
- `src/modules/agents/agent-instance-update-rules.ts` owns `updated_at`,
  enabled/settings filtering; `agent-instance-update-application.ts` owns
  update result mapping and ordered activity side effects;
  `src/adapters/agents/legacy-agent-instance-update-adapter.ts` keeps the
  `line_agents` update and `line_agent_activity` inserts behind the port.
- The `/api/agents/[slug]` PATCH route preserves exact slug filtering,
  timestamp/field filtering, failure 400, success activity vocabulary/order,
  returned row, and all Agent UI/data formats. GET remains on the prior
  compatibility boundary.
- Checkpoint: `ba40184`.
- Full verification: 149 Vitest files / 475 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the update
  rules, port, application, adapter, and route.
- Agent schema evolution, instance write-owner migration, registry cutover,
  reconciliation, and production traffic evidence remain deferred.

### WP6-AR Agent test-push compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/agent-test-push.contract.md`.
- `src/modules/agents/test-push-rules.ts` owns request normalization,
  style/title/accent defaults, validation, and support-channel selection;
  `test-push-application.ts` owns provider-error mapping and activity
  orchestration; `src/adapters/agents/legacy-test-push-adapter.ts` keeps the
  existing LINE message builder/sender and `line_agent_activity` writes behind
  the port.
- The `/api/agents/[slug]/test-push` POST route preserves the existing input
  defaults, validation messages, LINE delivery styles, support-vs-primary
  channel routing, activity vocabulary, HTTP statuses, response envelope, and
  all Agent UI/data formats.
- Checkpoint: `c955e80`.
- Full verification: 152 Vitest files / 481 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the test-push
  rules, port, application, adapter, and route.
- Agent schema evolution, provider credential rotation, message-template
  redesign, reconciliation, and production traffic evidence remain deferred.

### WP6-AS Agent overview read compatibility boundaries — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/agent-overview-read.contract.md`.
- `src/modules/agents/overview-read-rules.ts` preserves the existing
  `Number(days) || 7` query behavior; `overview-read-application.ts` owns the
  shared success/error envelope; the four `legacy-*overview-adapter.ts` files
  keep Search Console, GA4, teaching-system, and Google Calendar helpers
  behind one typed read port.
- The SEO, traffic, operations pipeline, and schedule week-overview routes
  preserve their provider calls, optional day ranges, `{ ok, data }` success
  envelopes, `502` error mapping, payloads, and all Agent UI/data formats.
- Checkpoint: `4a81bd8`.
- Full verification: 155 Vitest files / 487 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the shared
  application to all four routes and each provider through its adapter.
- Provider schema changes, credential rotation, cross-project repository
  cutover, reconciliation, and production traffic evidence remain deferred.

### WP6-AT Orders test-notification compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/orders-test-notification.contract.md`.
- `src/modules/orders/test-notification-rules.ts` owns the existing demo order,
  recipient trim/validation, push-style fallback, and LINE message plan;
  `test-notification-application.ts` owns delivery/activity ordering and
  error mapping; `src/adapters/orders/legacy-orders-test-notification-adapter.ts`
  keeps the `line_agents`, LINE, and `line_agent_activity` operations behind
  the port.
- The `/api/agents/orders/test-notify` POST route preserves the exact settings
  query, missing-recipient 400, supported-style/flex fallback, demo message
  text/title/accent, success response, activity vocabulary, provider-failure
  502, and the existing behavior of not checking `enabled` for this test-only
  action.
- Checkpoint: `8732ded`.
- Full verification: 158 Vitest files / 493 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the test
  notification rules, port, application, adapter, and route.
- Teachify/LINE schema evolution, provider credential rotation, notification
  template redesign, reconciliation, and production traffic evidence remain
  deferred.

### WP6-AU Subscribers broadcast compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/subscribers-broadcast.contract.md`.
- `src/modules/subscribers/broadcast-rules.ts` owns body normalization and
  defaults; `broadcast-application.ts` owns log-read mapping, recipient
  selection outcome, Promise.allSettled fan-out counts, and broadcast-log
  payload construction; `src/adapters/subscribers/legacy-broadcast-adapter.ts`
  keeps Supabase and LINE operations behind the port.
- The `/api/subscribers/broadcast` GET/POST routes preserve the existing log
  projection/order/limit, filters, styles, title/accent defaults, validation
  messages, query errors, no-recipient behavior, per-recipient failure counts,
  response envelopes/statuses, and all Subscribers UI/data formats.
- Checkpoint: `212b482`.
- Full verification: 161 Vitest files / 501 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps broadcast
  rules, application, port, adapter, and both route methods.
- Subscriber/LINE schema evolution, provider credential rotation, delivery
  queue redesign, reconciliation, and production traffic evidence remain
  deferred.

### WP6-AV Visit AI compatibility boundaries — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-ai-boundaries.contract.md`.
- `src/modules/visit/ai-rules.ts` owns draft-email/card request mapping and
  validation; `ai-application.ts` owns provider calls and ordered activity
  side effects; `src/adapters/visit/legacy-ai-adapter.ts` keeps the existing
  Visit provider port and `line_agent_activity` writes behind one adapter.
- The `/api/agents/visit/draft-email` and `/api/agents/visit/parse-card` POST
  routes preserve input defaults, validation strings, provider payloads,
  success/error activity vocabulary, response envelopes, HTTP 400/502 statuses,
  and all Visit UI/data formats.
- Checkpoint: `381f0b7`.
- Full verification: 164 Vitest files / 508 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps Visit rules,
  application, port, adapter, and both route methods.
- OpenAI/Google provider rotation, contact schema evolution, activity
  write-owner migration, reconciliation, and production traffic evidence
  remain deferred.

### WP6-AW Visit research compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-research.contract.md`.
- `src/modules/visit/research-rules.ts` owns request normalization;
  `research-application.ts` owns contact enrichment, validation, research
  orchestration, and the post-success profile read;
  `src/adapters/visit/legacy-research-adapter.ts` keeps the existing contacts
  lookup and `contact-research` helper behind the port.
- The `/api/agents/visit/research` GET/POST routes preserve the existing
  profile limit, contact projection/filter, fallback fields, validation and
  provider messages, response envelopes/statuses, `contact_profiles`,
  `agent_runs`, and `line_agent_activity` side effects, plus all Visit UI/data
  formats.
- Checkpoint: `7a40149`.
- Full verification: 167 Vitest files / 513 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the research
  rules, port, application, adapter, and route methods.
- Contact-profile schema/provider evolution, reconciliation, activity
  write-owner migration, and production traffic evidence remain deferred.

### WP6-AX Cron authentication compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/cron-auth.contract.md`.
- `src/modules/cron/auth-rules.ts` now owns the pure `CRON_SECRET` /
  `x-cron-key` decision; support daily report, team-lead report, metric
  snapshot, and Visit timeout routes use it directly. The knowledge-base
  recheck module keeps its compatibility-named wrapper.
- The five cron entrypoints preserve the exact configured-secret match,
  missing-secret 503, missing/mismatched-key 401, error messages, authorized
  workflows, provider/data side effects, and all existing UI/data formats.
- Checkpoint: `50c1b2f`.
- Full verification: 168 Vitest files / 516 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the shared
  rule to the four routes and the KB compatibility wrapper.
- Secret rotation, scheduling infrastructure, provider changes, schema
  evolution, and production traffic evidence remain deferred.

### WP6-AY TV idle compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/tv-idle.contract.md`.
- `src/modules/tv/idle-rules.ts` owns supported agent query values;
  `idle-application.ts` owns schedule caching, Visit tags, and Teamlead
  activity aggregation; `src/adapters/tv/legacy-idle-adapter.ts` keeps the
  existing Google/contact-tags/Supabase calls behind `TvIdlePort`.
- `/api/tv/idle` preserves schedule/Visit/Teamlead envelopes, ten-minute
  cache and `cached` flag, 24-hour activity cutoff, exact projection/order/
  limit, top-three aggregation, unknown-agent 400, provider-failure fallback,
  and all TV/UI/data formats.
- Checkpoint: `6e8b9e1`.
- Full verification: 171 Vitest files / 523 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps rules,
  application, port, adapter, and route.
- Calendar/tag/activity provider evolution, schema changes, cache policy
  redesign, reconciliation, and production traffic evidence remain deferred.

### WP6-AZ Visit public response read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-respond-read.contract.md`.
- `src/modules/visit/respond-ports.ts` defines the read/confirm/refetch
  contract and `src/adapters/visit/legacy-respond-read-adapter.ts` owns the
  existing `pending_invites` projection, optimistic confirmation, and refetch
  query. The route keeps public HTML rendering/control flow and leaves POST
  fulfilment unchanged.
- `/api/agents/visit/respond` GET preserves all query values, pending/confirmed
  branches, selected-slot labels, `pending` status filter, confirmation patch,
  refetch behavior, headers, copy, and data/status assumptions.
- Checkpoint: `3f7a9b0`.
- Full verification: 172 Vitest files / 524 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the adapter,
  port, shared slot selector, and route.
- Public response workflow evolution, schema migration, POST cutover,
  reconciliation, and production traffic evidence remain deferred.

### WP6-BA Visit public response joined-read compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-respond-read.contract.md`.
- The existing `VisitRespondReadPort` now covers both GET's `select("*")`
  read/confirm/refetch and POST's joined `contacts(name, title, email,
  company)` read; `legacy-respond-read-adapter.ts` owns those exact queries.
  POST settings, calendar/email/LINE providers, writes, background research,
  and public HTML remain unchanged.
- Checkpoint: `a02797a`.
- Full verification: 172 Vitest files / 524 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the shared
  port/adapter to both Visit respond methods.
- Visit fulfilment orchestration, provider/schema evolution, reconciliation,
  and production traffic evidence remain deferred.

### WP6-BB Visit public response fulfilment compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-respond-read.contract.md`.
- `VisitRespondFulfilmentPort` and
  `src/adapters/visit/legacy-respond-fulfilment-adapter.ts` now own Visit
  settings, calendar/email/LINE providers, pending invite fulfilment/failed
  writes, activity rows, and background research delegation. The route keeps
  the existing provider call order, best-effort catches, HTML, and workflow.
- Checkpoint: `13bf09e`.
- Full verification: 173 Vitest files / 525 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps read and
  fulfilment ports/adapters to both Visit respond methods.
- Visit workflow application orchestration, provider/schema evolution,
  reconciliation, and production traffic evidence remain deferred.

### WP6-BC LINE webhook payload compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-line-webhook.contract.md`.
- `parseVisitLineWebhookPayload` in
  `src/modules/visit/line-inbound.ts` now owns only raw JSON payload parsing.
  The route preserves invalid JSON/null HTTP 400 behavior, missing-events empty
  behavior, shared `LineInboundEvent` flow, normalization, handler dispatch,
  signature handling, and all provider/data side effects.
- Checkpoint: `116885b`.
- Full verification: 174 Vitest files / 527 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the parser and
  shared event type to the webhook route and normalizer.
- Handler/provider decomposition, signature policy changes, schema migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-BD LINE webhook dispatch compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-line-webhook-dispatch.contract.md`.
- `dispatchVisitLineWebhookEvents` in
  `src/modules/visit/line-webhook-application.ts` now owns the existing
  post-signature event fan-out: reply-token filtering, subscriber touch,
  fallback user id, inbound normalization, image/text/postback selection, and
  `Promise.allSettled` failure isolation. The route injects the unchanged
  handlers and keeps HTTP, signature, payload, provider, and data behavior.
- Checkpoint: `c7e7b01`.
- Full verification: 175 Vitest files / 530 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps dispatch,
  normalization, shared event types, and the webhook route.
- Handler/provider decomposition, signature policy changes, schema migration,
  reconciliation, and production traffic evidence remain deferred.

### WP6-BE LINE image provider compatibility boundary — Verified

- Behavior contract:
  `F:/ownproject/kv/docs/contracts/visit-line-image.contract.md`.
- `VisitLineImagePort` and
  `src/adapters/visit/legacy-line-image-adapter.ts` now own only LINE image
  content retrieval and business-card parsing. The route preserves image
  validation, run/activity tracking, exact contact/offer writes, locks, replies,
  provider-error handling, and all existing ordering.
- Checkpoint: `261ce21`.
- Full verification: 176 Vitest files / 531 tests, 93-page production build,
  and 130 Playwright smoke cases passed. Chrome retained the protected Agent
  catalog count and tier labels before and after; CodeGraph maps the adapter to
  the route and removes direct provider imports from the handler.
- Image-flow application decomposition, provider replacement, schema
  migration, reconciliation, and production traffic evidence remain deferred.

## Current Boundary

Safe TypeScript, compatibility, provider-port, and route strangler work may
continue against the existing row formats. Database migrations, repository
cutover, and real canary traffic remain deferred until an authorized
production-like schema export and provider environment are available.
