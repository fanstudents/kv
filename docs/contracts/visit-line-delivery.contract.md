# Visit LINE delivery compatibility contract

## Scope

This contract covers outbound LINE replies emitted by the primary Visit
webhook. The refactor introduces a typed delivery port and a legacy adapter;
the existing LINE API helper, channel default, message payloads, and error
boundaries remain unchanged.

## Owner boundary

- `src/modules/visit/line-delivery-ports.ts#VisitLineDeliveryPort` owns the
  Visit-facing outbound delivery contract.
- `src/adapters/visit/legacy-line-delivery-adapter.ts#createLegacyVisitLineDeliveryAdapter`
  owns the current `@/lib/line` binding.
- `src/lib/line.ts#replyLineMessage` and
  `src/lib/line.ts#replyLineRawMessages` remain the compatibility
  implementation until a provider replacement is explicitly approved.

## Preserved behavior

- Text replies pass the same reply token and text to `replyLineMessage`.
- Raw replies pass the same reply token and message array to
  `replyLineRawMessages`.
- The existing primary LINE channel default is preserved.
- Existing `await` ordering and best-effort `.catch(() => {})` behavior in the
  Visit webhook remain unchanged.
- Signature verification, inbound parsing, persistence, runtime tracking,
  provider calls, response text, and UI are outside this boundary and remain
  unchanged.

## Verification evidence

- Code checkpoint: `af67fc9`.
- `npm run verify:full`: 184 Vitest files / 544 tests, 93 production pages,
  and 130 Playwright smoke cases passed.
- Chrome reload comparison retained the protected Agent catalog count and all
  tier labels. Application-only DOM snapshots were exactly equal before and
  after.
- CodeGraph maps `createLegacyVisitLineDeliveryAdapter` to the primary Visit
  webhook and keeps both LINE helpers behind that adapter for this route.
  `rg` confirms the route has no direct `replyLineMessage` or
  `replyLineRawMessages` references.

## Deferred work

Replacing the LINE transport/provider, adding delivery retries or an outbox,
changing channel policy, schema migration, and production canary evidence are
deferred until the provider contract and operational environment are approved.
