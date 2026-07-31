---
schema_version: behavior-contract/v1
id: kv.visit.line-image-provider.compatibility
title: Visit LINE Image Provider Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Move LINE image content retrieval and business-card parsing behind a legacy provider adapter.
  non_goals:
    - Change card parsing prompts/results, image validation, run tracking, replies, or persistence flow.
    - Change LINE or OpenAI provider implementations, schema assumptions, or database row formats.
    - Change the frontend UI/UX.
---

# Visit LINE Image Provider Compatibility

## Behavior Boundary

`VisitLineImagePort` owns only the two provider calls used by the existing
LINE image/card handler: retrieving a LINE message as a data URL and parsing
that data URL as a `VisitBusinessCard`. `legacy-line-image-adapter.ts` binds
those methods to the current LINE and OpenAI helpers. The route keeps image
validation, run/activity tracking, contact/offer writes, lock handling, reply
payloads, and all ordering.

## Invariants

1. The image handler still calls LINE content retrieval with the original
   message id and parses the returned data URL with the existing card parser.
2. Non-image data URLs still receive the exact existing reply and return before
   run tracking or persistence work.
3. Provider errors still enter the existing activity failure, run failure, and
   best-effort error reply path.
4. Parsed `VisitBusinessCard` fields, card-reply formatting, contact/offer row
   mappings, tags, locks, reports, and LINE messages remain unchanged.
5. The adapter is server-only; no provider implementation or browser bundle is
   introduced, and UI behavior remains unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-line-image-legacy-adapter.test.ts
    - tests/unit/visit-line-webhook-application.test.ts
    - tests/unit/visit-line-inbound.test.ts
    - tests/unit/visit-legacy-schema.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `createLegacyVisitLineImageAdapter` to the LINE webhook route;
  the route no longer imports the raw image retrieval helper or card parser
  directly.
- Full verification at `261ce21`: 176 Vitest files / 531 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  image provider boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Image retrieval and card parsing now have an explicit injectable provider
  seam with a legacy adapter and focused binding test.
- Image-flow application decomposition, provider replacement, schema migration,
  reconciliation, and production traffic evidence remain deferred.
