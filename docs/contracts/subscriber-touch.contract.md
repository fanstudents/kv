# Subscriber touch compatibility contract

## Scope

This contract covers the best-effort subscriber presence update performed by
the primary Visit LINE webhook and the Support LINE relay. The refactor adds a
shared channel-aware port and legacy adapter without changing the existing
`line_subscribers` row format or profile lookup behavior.

## Owner boundary

- `src/modules/subscribers/touch-ports.ts#SubscriberTouchPort` owns the
  channel-aware subscriber touch contract.
- `src/adapters/subscribers/legacy-touch-adapter.ts#createLegacySubscriberTouchAdapter`
  owns the current helper binding.
- `src/lib/subscribers.ts#touchSubscriber` remains the compatibility
  implementation until the subscriber repository/provider is replaced.

## Preserved behavior

- Visit calls the port with channel `primary`.
- Support calls the port with channel `support`.
- Existing lookup, `last_seen_at` update, optional LINE profile enrichment,
  insert mapping, and error behavior remain unchanged.
- Visit dispatch keeps its existing best-effort `.catch(() => {})` isolation.
- Support relay keeps its existing port shape, event processing, activity and
  conversation behavior.
- No schema, row format, provider policy, or UI change is part of this stage.

## Verification evidence

- Code checkpoint: `5e08c96`.
- `npm run verify:full`: 185 Vitest files / 545 tests, 93 production pages,
  and 130 Playwright smoke cases passed.
- Chrome reload comparison retained the protected Agent catalog count and all
  tier labels. Application-only DOM snapshots were exactly equal before and
  after; only reload-only Next.js Dev Tools/alert nodes were normalized.
- CodeGraph maps the shared adapter to the Visit webhook and Support relay
  adapter. `rg` confirms direct `touchSubscriber` imports remain only inside
  the legacy adapter.

## Deferred work

Replacing the subscriber repository, changing channel/profile policy, schema
migration, reconciliation, retry/outbox behavior, and production canary
evidence are deferred until the provider environment and data contract are
approved.
