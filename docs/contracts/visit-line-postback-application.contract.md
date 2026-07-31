# Visit LINE postback application contract

This contract records the compatibility boundary for the primary Visit LINE
webhook's postback actions. It moves confirm/cancel delegation and tag
quick-reply handling out of the HTTP route while preserving the existing LINE
data strings, tag behavior, and offer application boundary.

## Owner and composition

- Application owner: `src/modules/visit/line-postback-application.ts`
- Entry point: `createVisitLinePostbackHandler`
- Current composition root: `src/app/api/line/webhook/route.ts`
- Injected boundaries: Visit offer handler, contact tags, and LINE delivery.

## Preserved behavior

For an inbound postback event, the handler must:

1. return without side effects when the reply token is missing;
2. parse the existing URL-encoded `action`, `contact`, and `value` data;
3. map `confirm` to the offer handler with `要` and `cancel` to the offer
   handler with `不要`, forwarding the original event, user id, and base URL;
4. for a complete `tag` action, append the tag through the existing contact
   tag port and reply with the existing current-tag list copy;
5. ignore incomplete or unknown tag/action payloads without sending a reply;
6. preserve the `tag_done` acknowledgement copy; and
7. preserve action ordering, payload encoding, failure propagation, and the
   existing downstream offer handler's lock/runtime semantics.

## Evidence

- Code checkpoint: `e47fcfd` (`refactor: extract visit line postback application`)
- Focused behavior tests: `tests/unit/visit-line-postback-application.test.ts`
- Full verification: 190 Vitest files / 562 tests, 93-page production build,
  and 130 Playwright smoke cases passed.
- Chrome application-only DOM snapshots matched exactly before and after the
  extraction; the Agent catalog count and tier labels remained present.
- CodeGraph maps `createVisitLinePostbackHandler` and its returned handler to
  the LINE route composition. The route no longer owns URL parsing, tag writes,
  or postback reply orchestration.

## Deferred boundary

The following remain intentionally outside this checkpoint: normalized
postback payload cutover, replacement of legacy repositories/providers, schema
migration, data reconciliation, outbox/retry policy, full Visit flow cutover,
shadow/canary traffic, and production-like provider/database evidence.
