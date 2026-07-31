---
schema_version: behavior-contract/v1
id: kv.knowledge-base.import-upload.compatibility
title: Knowledge Base Import Upload Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Knowledge Base PDF upload validation and import delegation from the route.
  non_goals:
    - Change PDF extraction, chunking, AI conversion, sensitivity scan, or persistence.
    - Change the Knowledge Base import UI, response/status mapping, or row formats.
    - Add a schema migration, repository cutover, or provider migration.
---

# Knowledge Base Import Upload Compatibility

## Behavior Boundary

The rules module owns the existing PDF extension and 12MB size policy. The
application module delegates the already-buffered upload to a provider-neutral
port. The legacy adapter keeps `importPdf`, including checksum de-duplication,
PDF extraction, AI conversion, draft creation, source status updates, and
provider errors. FormData/File/Buffer construction and HTTP error mapping stay
in the route.

## Invariants

1. Non-PDF names return HTTP 400 with
   `目前只支援 PDF；Word／簡報請先另存成 PDF`.
2. Files over 12MB return HTTP 413 with the existing message.
3. Valid uploads preserve the `{ sourceId, filename, pageCount, chunkCount,
   processedChunks, candidateCount, truncated }` result shape.
4. Checksum behavior, extraction/chunking/AI pipeline, draft status, source
   rows, provider exceptions, and `maxDuration = 300` remain unchanged.
5. Missing form files still use the existing route-level 400 response.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/knowledge-base-import-upload-rules.test.ts
    - tests/unit/knowledge-base-import-upload-application.test.ts
    - tests/unit/knowledge-base-legacy-import-upload-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `validateKnowledgeBaseImportFile`,
  `runKnowledgeBaseImportUpload`, and
  `createLegacyKnowledgeBaseImportUploadAdapter` to the import POST route;
  `importPdf` remains behind the adapter.
- Full verification at `18bbd87`: 135 Vitest files / 449 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Knowledge Base import upload boundary; the normalized DOM snapshot was
  unchanged.

## Intentional Changes

- Upload policy and delegation are now independently testable and replaceable.
- Existing PDF/AI processing, persistence, response data, and UI behavior
  remain unchanged.
