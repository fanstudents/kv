# Visit LINE image application contract

This contract records the compatibility boundary for the primary Visit LINE
webhook's image-to-contact flow. It extracts orchestration from the route while
continuing to use Dennis's existing image, provider, runtime, LINE, tag, lock,
and row-format behavior.

## Owner and composition

- Application owner: `src/modules/visit/line-image-application.ts`
- Entry point: `createVisitLineImageHandler`
- Current composition root: `src/app/api/line/webhook/route.ts`
- Injected boundaries: image/provider, LINE delivery, card persistence, tag,
  activity, conversation lock, runtime, and existing card/Flex renderers.

## Preserved behavior

For an inbound image event, the handler must:

1. return without side effects when the message id or reply token is missing;
2. fetch the LINE message as a data URL and reject non-image data with the
   existing reply, without starting a Visit run;
3. start the existing Visit run with the LINE message id, report the scan step
   with the real image, and parse the business card through the existing
   provider port;
4. on fetch/parse/runtime failure, record the existing failed activity, end the
   run with the same summary/error detail, and keep the failure reply best
   effort;
5. record the same recognized/pending activity summary and card reply text;
6. for an unrecognized card, report the scan state, end the run as failed, and
   reply with the existing card-summary copy;
7. for a recognized card, report the write and confirmation waiting steps,
   acquire the Visit lock with the `card_review` context, and create the same
   `contacts` row through the legacy card port;
8. when Email is absent, list tags, show the existing no-Email message and
   quick-reply payload, and release the lock without creating an offer;
9. when Email exists, create the same `visit_offers` row and reply with the
   existing card summary and decision Flex card; and
10. preserve the original ordering, payloads, copy, failure boundaries, and
    lock semantics.

## Evidence

- Code checkpoint: `eb32659` (`refactor: extract visit line image application`)
- Focused behavior tests: `tests/unit/visit-line-image-application.test.ts`
- Full verification: 188 Vitest files / 553 tests, 93-page production build,
  and 130 Playwright smoke cases passed.
- Chrome application-only DOM snapshots matched exactly before and after the
  extraction; the Agent catalog count and tier labels remained present.
- CodeGraph maps `createVisitLineImageHandler` and its returned handler to the
  LINE route composition. The route no longer directly calls image retrieval,
  card parsing, Visit runtime, or contact/offer persistence.

## Deferred boundary

The following remain intentionally outside this checkpoint: replacement of the
legacy repositories/providers, schema migration, data reconciliation,
outbox/retry policy, full Visit flow cutover, shadow/canary traffic, and
production-like provider/database evidence.
