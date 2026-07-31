# Visit LINE text application contract

This contract records the compatibility boundary for the primary Visit LINE
webhook's text-event dispatcher. It moves the existing approval/offer routing
and generic fallback reply out of the HTTP route without changing the current
LINE copy, ordering, provider behavior, or data formats.

## Owner and composition

- Application owner: `src/modules/visit/line-text-application.ts`
- Entry point: `createVisitLineTextHandler`
- Current composition root: `src/app/api/line/webhook/route.ts`
- Injected boundaries: invite-approval handler, offer handler, LINE delivery,
  and activity ports.

## Preserved behavior

For an inbound text event, the handler must:

1. return without side effects when the reply token is missing;
2. trim the user text before dispatch;
3. give the pending invite approval handler first refusal, returning when it
   handles the event;
4. give the pending offer handler second refusal, returning when it handles the
   event;
5. otherwise send the existing generic Visit capability reply and record the
   same successful activity summary using the original, untrimmed text prefix;
6. preserve the existing failure boundary: if the fallback reply/activity
   sequence throws, record the same failed activity summary and error message;
7. preserve the handler signature used by the normalized webhook dispatcher,
   including the externally composed `baseUrl`.

## Evidence

- Code checkpoint: `78ab088` (`refactor: extract visit line text application`)
- Focused behavior tests: `tests/unit/visit-line-text-application.test.ts`
- Full verification: 189 Vitest files / 558 tests, 93-page production build,
  and 130 Playwright smoke cases passed.
- Chrome application-only DOM snapshots matched exactly before and after the
  extraction; the Agent catalog count and tier labels remained present.
- CodeGraph maps `createVisitLineTextHandler` and its returned handler to the
  LINE route composition. The route no longer owns generic fallback reply or
  activity orchestration.

## Deferred boundary

The following remain intentionally outside this checkpoint: postback/tag
application extraction, replacement of legacy repositories/providers, schema
migration, data reconciliation, outbox/retry policy, full Visit flow cutover,
shadow/canary traffic, and production-like provider/database evidence.
