---
schema_version: behavior-contract/v1
id: kv.knowledge-base.crawl-import.compatibility
title: Knowledge Base Crawl Import Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate crawl import request rules, orchestration, and legacy provider access from the route.
  non_goals:
    - Change Firecrawl scraping/crawling, PDF parity, AI conversion, or source/document row formats.
    - Change the Knowledge Base UI, response envelope, credit semantics, or crawl preview GET flow.
    - Add a schema migration, repository cutover, or production traffic switch.
---

# Knowledge Base Crawl Import Compatibility

## Behavior Boundary

The rules module owns URL normalization, single/site mode selection, and the
existing 1..60 page-limit clamp with a default of 25. The application module
owns the import-then-read orchestration and returns newly imported drafts and
current credit usage. The legacy adapter keeps `importUrl`, draft
`listKnowledgeDocs`, `getCreditUsage`, and `FirecrawlQuotaError`
classification behind a provider-neutral port. The route retains request
body parsing, HTTP response/status mapping, and `maxDuration`.

## Invariants

1. URL strings are trimmed; only `http:` and `https:` are accepted, with HTTP
   400 and `請提供有效的網址（http/https）` for missing or invalid values.
2. `mode: "site"` is preserved; all other modes resolve to `"single"`.
3. `limit` preserves the existing numeric behavior: default 25, minimum 1,
   maximum 60.
4. A successful import preserves the existing result fields, then reads
   drafts by the returned `sourceId` and current credit usage in parallel;
   `unchanged` results and `credit: null` remain visible.
5. `FirecrawlQuotaError` remains HTTP 429; other import failures remain
   HTTP 500 with the existing error message fallback.
6. Import URL normalization, checksum/de-duplication, crawl/scrape behavior,
   ingest pipeline, source/document persistence, and all UI-facing data
   formats remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-crawl-import-rules.test.ts
    - tests/unit/knowledge-base-crawl-import-application.test.ts
    - tests/unit/knowledge-base-legacy-crawl-import-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseKnowledgeBaseCrawlImportRequest`,
  `runKnowledgeBaseCrawlImport`, and
  `createLegacyKnowledgeBaseCrawlImportAdapter` to the crawl POST route;
  `importUrl`, draft reads, credit usage, and quota classification remain
  behind the adapter.
- Full verification at `1cec8b3`: 141 Vitest files / 461 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after
  the crawl import boundary; the DOM snapshot was exactly unchanged.

## Intentional Changes

- Crawl import input policy, orchestration, and provider access are now
  independently testable and replaceable.
- Existing Firecrawl/ingest behavior, persistence assumptions, response data,
  POST error mapping, and UI behavior remain unchanged.
