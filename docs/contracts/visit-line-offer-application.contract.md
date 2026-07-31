# Visit LINE offer application contract

This contract records the compatibility boundary for the primary Visit LINE
webhook's response to a pending business-card offer. It is intentionally an
application-layer extraction: it does not change Dennis's row shapes, provider
contracts, LINE copy, UI payloads, or database lifecycle.

## Owner and composition

- Application owner: `src/modules/visit/line-offer-application.ts`
- Entry point: `createVisitLineOfferReplyHandler`
- Current composition root: `src/app/api/line/webhook/route.ts`
- Injected boundaries: Visit workflow persistence, LINE delivery, Visit
  providers, settings, runtime, activity, conversation lock, contact tags,
  and the existing card/email renderers.

## Preserved behavior

For an inbound text/postback mapped to a pending offer, the handler must:

1. return `false` when there is no reply token, pending offer, or associated
   contact;
2. interpret the user's card decision through the existing provider, falling
   back to the existing keyword classifier when provider interpretation fails;
3. reply with the existing clarification copy for an unrecognized response;
4. resolve a cancellation as `declined`, record the existing runtime/activity
   outcome, show the existing tag quick-reply payload, and release the Visit
   conversation lock;
5. persist a correction to the existing contact field, rebuild the same card
   summary, and ask for confirmation again without resolving the offer;
6. reload the contact before confirmation, reject a missing/invalid Email with
   the existing copy, and otherwise resolve the offer as `accepted`;
7. read the current Visit settings and request exactly two free slots using the
   existing calendar range, working hours, duration, and meeting type inputs;
8. preserve the no-slots reply, failed activity record, and lock release;
9. create the existing pending-invite payload, including the two slot objects
   and `requiresApproval` flag;
10. when approval is required, keep the lock, report the draft step, return the
    existing draft copy, and record a pending activity without sending email;
11. otherwise render the existing response-link email HTML, send it through the
    injected provider, save the existing runtime artifact, report the sent
    step, end the run successfully, reply with the existing confirmation, record
    the pending activity, and release the lock; and
12. preserve the existing failure activity, best-effort reply, and lock release
    boundary around scheduling/email work.

The handler returns `true` after it has recognized and handled an offer
response, including an explicit clarification or invalid Email response.

## Evidence

- Code checkpoint: `c82f6e6` (`refactor: extract visit offer application`)
- Focused behavior tests: `tests/unit/visit-line-offer-application.test.ts`
- Full verification: 187 Vitest files / 549 tests, 93-page production build,
  and 130 Playwright smoke cases passed.
- Chrome application-only DOM snapshots matched exactly before and after the
  extraction; the Agent catalog count and tier labels remained present.
- CodeGraph maps `createVisitLineOfferReplyHandler` and its returned handler to
  the LINE route, postback dispatcher, and text dispatcher. The route no longer
  contains pending-offer/provider/calendar orchestration calls.

## Deferred boundary

The following remain intentionally outside this checkpoint: replacement of the
legacy workflow/settings/provider repositories, schema migration, data
reconciliation, outbox/retry policy, full Visit flow cutover, shadow/canary
traffic, and production-like provider/database evidence.
