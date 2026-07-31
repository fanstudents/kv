# Visit LINE workflow persistence compatibility contract

## Scope

This boundary isolates the legacy `visit_offers`, `pending_invites`, and
contact-correction persistence used by the main Visit LINE conversation. It is
the persistence owner for the workflow seam; it does not move business
decisions, provider calls, replies, runtime events, or schema ownership.

## Owner

- `VisitLineWorkflowPersistencePort` exposes pending-offer lookup, offer
  resolution, contact correction/read, pending-invite creation, approval
  lookup, invite status updates, and draft revision.
- `createLegacyVisitLineWorkflowAdapter` owns the exact Supabase queries,
  projections, legacy row mappers, and update payloads.
- The route remains responsible for intent classification, branch ordering,
  settings/provider calls, runtime reporting, replies, locks, activity, and
  error boundaries.

## Preserved contract

- Pending offer and approval invite lookups keep the existing joined-contact
  projections, `line_user_id`/status filters, newest-first ordering, limit, and
  `maybeSingle` behavior.
- Offer resolution keeps the existing `accepted`/`declined` status mapping and
  `resolved_at` timestamp shape.
- Contact correction keeps the dynamic field update and contact re-read shape.
- Pending invite creation keeps the exact eleven legacy row fields, status
  selection from `requiresApproval`, and `.select().single()` behavior.
- Approval status updates keep `cancelled`/`pending`/`failed` vocabulary;
  revision keeps the subject/body patch only.
- Query errors, return-null behavior, provider ordering, replies, HTTP
  responses, runtime projections, and UI output remain unchanged. No retry,
  transaction, or schema migration is introduced.

## Verification evidence

- Code checkpoint: `be5c294`.
- Focused adapter tests: 3 passed; full verification: 182 Vitest files / 542
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome application-only DOM snapshots matched exactly before and after
  (`3642` chars); catalog count and tier markers remained present. Reload-only
  Next.js Dev Tools/alert nodes were excluded from the comparison.
- CodeGraph maps the new adapter and port only through the Visit LINE route;
  `rg` confirms the route has no direct offer/invite table writes or legacy
  mapping-helper imports.

## Deferred

Workflow repository replacement, schema migration, outbox/reconciliation,
provider cutover, and production traffic evidence remain deferred.
