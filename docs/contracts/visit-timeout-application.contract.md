# Visit timeout application contract

This contract records the compatibility boundary for the Visit timeout cron
job. The extraction changes ownership of orchestration only; the existing
`visit_offers` row format, response envelope, LINE copy, live-task projection,
and UI remain unchanged.

## Owner and composition

- Application owner: `src/modules/visit/timeout-application.ts`
- Entry point: `runVisitTimeoutApplication`
- HTTP entry point: `GET src/app/api/cron/visit-timeout/route.ts`
- Existing shared boundaries: `VisitLineWorkflowPersistencePort`,
  `VisitLineDeliveryPort`, `VisitLineActivityPort`, `ContactTagPort`,
  `LiveTaskUpdatePort`, and `ConversationLockPort`
- Legacy composition: `legacy-line-workflow-adapter.ts`,
  `legacy-line-delivery-adapter.ts`, and the existing domain adapters

The timeout flow deliberately does not add a timeout-specific repository or
delivery adapter. Stale-offer lookup and LINE text delivery are capabilities of
the existing Visit workflow and delivery boundaries, preventing one-route-one-
module growth.

## Preserved behavior

For an authorized cron request, the application must:

1. query pending `visit_offers` created earlier than three minutes ago and
   later than twenty minutes ago, with a batch limit of `20`;
2. resolve each selected offer through the legacy-compatible resolution
   mapping. The application vocabulary is `timed_out`; the legacy schema
   mapping continues to write `status = "declined"` and `resolved_at`;
3. add the existing `待跟進` tag only when a contact id is present;
4. record the existing Visit activity summary and `success` status;
5. set the existing Visit live-task state (`step: 2`, `status: "done"`) and
   caption;
6. when a LINE user id exists, send the existing timeout message and release
   the Visit conversation lock; push and lock failures remain best-effort;
7. return `{ ok: true, handled }` from the route; and
8. preserve fail-closed `x-cron-key` authentication and its existing error
   responses.

The loop remains sequential so resolution, tag/activity/live-task ordering,
and side-effect timing match the legacy route. The clock is injectable only to
make the time window deterministic in tests; production uses the system clock.

## Evidence

- Code checkpoint: `e03012d` (`refactor: consolidate visit timeout application`)
- Focused behavior tests: `tests/unit/visit-timeout-application.test.ts`,
  `tests/unit/visit-line-workflow-legacy-adapter.test.ts`, and
  `tests/unit/visit-line-delivery-legacy-adapter.test.ts`
- Focused result: 3 files / 8 tests passed
- Full verification: 191 Vitest files / 566 tests, 93-page production build,
  and 130 Playwright smoke cases passed
- Chrome application-only snapshot for `/agents-catalog` matched exactly
  before and after (`3642` characters); the `專業型` link opened the same
  professional page and returned to the catalog without an error marker
- A real `/agents/visit` navigation was attempted in Chrome, but the current
  browser session redirected to `/login`; authenticated backend actions are
  therefore not claimed as verified until a valid session is restored
- CodeGraph was refreshed after the change. The new application and both
  legacy adapters map to the cron route; `rg` confirms the route no longer
  contains direct Supabase, LINE push, live-task, activity, or legacy schema
  orchestration.

## Deferred boundary

The following remain intentionally outside this checkpoint: Supabase/LINE
provider replacement, repository cutover, schema migration, data
reconciliation, outbox/retry policy, authenticated production-backend traffic,
and canary evidence. Existing row formats remain the source of truth until an
authorized schema export is available.
