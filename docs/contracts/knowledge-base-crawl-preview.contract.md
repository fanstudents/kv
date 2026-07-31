---
schema_version: behavior-contract/v1
id: kv.knowledge-base.crawl-preview.compatibility
title: Knowledge Base Crawl Preview Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate crawl preview query parsing, orchestration, and Firecrawl compatibility from the route.
  non_goals:
    - Change the Firecrawl provider, crawl limits, credit semantics, or Knowledge Base row formats.
    - Change the Knowledge Base UI, response envelopes, or crawl import POST pipeline.
    - Add a schema migration, repository cutover, or production traffic switch.
---

# Knowledge Base Crawl Preview Compatibility

## Behavior Boundary

The rules module owns the existing URL predicate and the distinction between
credit-only and site-preview requests. The application module owns preview
orchestration: it reads credit usage alone for the credit branch, and for a
site request maps at most 200 links while returning the first 30 links with
the total count and current credit usage. The legacy adapter keeps
`mapSite`, `getCreditUsage`, and `FirecrawlQuotaError` classification behind a
provider-neutral port. The route retains HTTP response/status mapping and
the existing crawl import POST path.

## Invariants

1. A missing `url` returns the existing credit-only response shape
   `{ credit }` without invoking site mapping.
2. `http:` and `https:` URLs are accepted; malformed or non-HTTP(S) values
   return HTTP 400 with `請提供有效的網址`.
3. Valid site previews invoke mapping with the existing limit `200`, return
   `{ count, links, credit }`, expose at most the first 30 links, and keep
   the provider's link order and title fields.
4. `FirecrawlQuotaError` remains HTTP 429; other preview failures remain
   HTTP 502 with the existing error message fallback.
5. The crawl POST route continues to use the legacy `importUrl` pipeline,
   URL validation, credit checks, source/document persistence, and
   `maxDuration` unchanged.
6. No UI, UI-facing data format, database schema, or migration behavior is
   changed by this boundary.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-crawl-preview-rules.test.ts
    - tests/unit/knowledge-base-crawl-preview-application.test.ts
    - tests/unit/knowledge-base-legacy-crawl-preview-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseCrawlPreviewQuery`,
  `runKnowledgeBaseCrawlPreview`, and
  `createLegacyKnowledgeBaseCrawlPreviewAdapter` to the crawl GET route;
  `mapSite`, `getCreditUsage`, and quota classification remain behind the
  adapter.
- Full verification at `d3a0858`: 138 Vitest files / 455 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after
  the crawl preview boundary; the DOM snapshot was exactly unchanged.

## Intentional Changes

- Crawl preview parsing, orchestration, and provider access are now
  independently testable and replaceable.
- Existing crawl preview responses, provider behavior, POST import flow,
  persistence assumptions, and UI behavior remain unchanged.
