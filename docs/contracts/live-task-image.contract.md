---
schema_version: behavior-contract/v1
id: kv.live-task.image.compatibility
title: Live Task Image Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Live Task image data-URL parsing and state lookup from the image route.
  non_goals:
    - Change agent_live_task image columns, TTL, or state writes.
    - Change TV UI, image encoding, or add schema migrations.
---

# Live Task Image Compatibility

## Behavior Boundary

The rules module owns the existing agent query default and data-URL regex. The
application module maps a stored image to a not-found or opaque descriptor. The
legacy adapter keeps the existing `getLiveImage` Supabase-backed helper. The
route remains responsible for Node `Buffer` conversion and HTTP headers.

## Invariants

1. The `agent` query defaults to an empty string.
2. Missing images and non-matching data URLs return 404 with no body.
3. Matching `data:<content-type>;base64,<payload>` values are decoded with the
   existing Node `Buffer` behavior and returned with `content-type` preserved
   and `cache-control: no-store`.
4. No UI, `agent_live_task` row/schema, state-write, TTL, or image encoding
   behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/live-task-image-rules.test.ts
    - tests/unit/live-task-image-application.test.ts
    - tests/unit/live-task-image-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the image rules, application, port, adapter, and route as a
  single boundary; `getLiveImage` remains the only legacy state-store caller.
- Full verification at `1bb02b4` plus this checkpoint: 58 Vitest files / 330
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  image route cutover.

## Intentional Changes

- Live Task image parsing and not-found mapping are now unit-tested and
  provider-neutral.
- Existing Supabase storage, data URL, response headers, and TV consumers stay
  unchanged.
