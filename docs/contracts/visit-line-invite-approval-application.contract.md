# Visit LINE invite approval application contract

## Scope

This contract covers the Visit LINE text flow for a pending invite: cancel,
send, and revise. The HTTP route remains responsible for transport and
composition; the application handler now orchestrates the existing ports and
providers through injected dependencies.

## Owner boundary

- `src/modules/visit/line-invite-approval-application.ts#VisitLineInviteApprovalDependencies`
  defines the application boundary.
- `createVisitLineInviteApprovalHandler` owns invite approval intent branching,
  ordering, runtime/activity side effects, reply behavior, and lock release.
- `src/app/api/line/webhook/route.ts` only composes the legacy adapters/providers
  and delegates from text dispatch.

## Preserved behavior

- Missing reply token, missing invite, and missing contact still return
  `false` without side effects.
- Cancel keeps the existing cancelled status, reply copy, and lock release.
- Send keeps settings lookup, HTML rendering, provider call, pending/failed
  status transitions, artifact/runtime/activity writes, reply copy, and lock
  release ordering.
- Revision keeps the same settings/provider inputs, draft update, reply copy,
  error activity, and best-effort failure reply.
- Existing `pending_invites` row shape, provider behavior, data format, and UI
  are unchanged.

## Verification evidence

- Code checkpoint: `847bb97`.
- `npm run verify:full`: 186 Vitest files / 547 tests, 93 production pages,
  and 130 Playwright smoke cases passed.
- Chrome reload comparison retained the protected Agent catalog count and all
  tier labels. Application-only DOM snapshots were exactly equal before and
  after; only reload-only Next.js Dev Tools/alert nodes were normalized.
- CodeGraph maps `createVisitLineInviteApprovalHandler` to the route and its
  text dispatcher; the route no longer owns the invite approval orchestration
  body.

## Deferred work

Full Visit offer-flow extraction, runtime cutover/shadow/canary, provider
replacement, schema migration, reconciliation, and production traffic
evidence remain deferred.
