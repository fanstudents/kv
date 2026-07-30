---
schema_version: behavior-contract/v1
id: kv.live-task.read.compatibility
title: Live Task Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Live Task state and run-step composition from the GET route.
  non_goals:
    - Change agent_live_task or agent_run_steps row formats, TTL, or owners.
    - Change TV polling, flow-node rendering, or schema/data behavior.
    - Add migrations or replace the existing Supabase-backed readers.
---

# Live Task Read Compatibility

## Behavior Boundary

The rules module owns the query-agent default. The application module composes
the existing `agent_live_task` snapshot with the latest `agent_run_steps`
record, preserving step/status/caption precedence and inactive fallback. The
legacy adapter keeps both existing readers behind an explicit port. The route
remains responsible only for query parsing and HTTP response mapping.

## Invariants

1. The `agent` query defaults to an empty string and is passed unchanged to
   both legacy readers.
2. If both readers return no record, the response remains `{ "active": false }`.
3. A run-step record takes precedence for `nodeId`, `runId`, `status`, and
   `caption`; task state continues to provide `step`, image metadata, and the
   fallback status/caption/timestamp exactly as before.
4. Unknown run-step statuses normalize to `active`; missing optional fields
   remain `null`/`0` and no UI, TTL, row format, or schema behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/live-task-read-rules.test.ts
    - tests/unit/live-task-read-application.test.ts
    - tests/unit/live-task-read-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the read rules, application, port, adapter, and route as one
  boundary; `getLiveTaskState` and `currentStep` remain behind the adapter.
- Full verification at `fa309ba` plus this checkpoint: 64 Vitest files / 341
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  GET-route cutover.

## Intentional Changes

- Live Task read composition is now unit-tested and provider-neutral.
- Existing Supabase reads, status precedence, TTL behavior, image metadata,
  and TV consumers stay unchanged.
