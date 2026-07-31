# Conversation lock compatibility contract

## Scope

This boundary isolates the existing conversation-lock persistence used by the
Visit LINE webhook and the Visit timeout cron. It is an infrastructure seam,
not a new lock policy or a schema migration.

## Owner

- `ConversationLockPort` exposes `acquire` and `release` without exposing a
  Supabase client to route handlers.
- `createLegacyConversationLockAdapter` binds the port to the existing
  `acquireLock` and `releaseLock` helpers and lazily constructs the legacy
  Supabase client.
- The webhook and timeout routes remain owners of workflow decisions,
  user-facing replies, and caller-side error swallowing.

## Preserved contract

- The existing `line_conversation_locks` row format and table remain unchanged.
- Acquisition keeps the 15-minute default TTL, optional `ttlMinutes`, context
  payload, same-owner renewal, expired-lock replacement, and `{ ok: false,
  heldBy }` result for another active owner.
- Release keeps the `line_user_id` plus `owner_agent_slug` filter and returns
  the legacy helper's awaited error behavior. The timeout route continues to
  swallow release failures exactly where it did before.
- No new retry, transaction, locking policy, concurrency behavior, or schema
  migration is introduced.
- LINE replies, timeout notifications, Visit runtime projections, HTTP
  responses, and all UI output remain unchanged.

## Verification evidence

- Code checkpoint: `d538b52`.
- Focused adapter tests: 2 passed.
- Full verification: 180 Vitest files / 537 tests, 93-page production build,
  and 130 Playwright smoke cases passed.
- Chrome application-only DOM parity was exact before/after (`3642` chars);
  the comparison normalized only reload-only Next.js Dev Tools/alert nodes,
  while all catalog and tier markers remained present.
- CodeGraph maps the adapter to the LINE webhook and timeout routes; direct
  `acquireLock`/`releaseLock` imports remain only inside the legacy adapter.

## Deferred

Lock repository replacement, schema migration, distributed-lock changes,
reconciliation, and production traffic evidence remain deferred.
