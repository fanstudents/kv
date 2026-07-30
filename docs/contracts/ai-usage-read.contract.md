---
schema_version: behavior-contract/v1
id: kv.ai-usage.read.compatibility
title: AI Usage Read Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate AI usage report aggregation and budget lookup from the dashboard route.
  non_goals:
    - Change ai_usage_logs columns, row formats, or retention policy.
    - Change budget limits, pricing, cache behavior, or write paths.
    - Change the AI usage dashboard UI or add schema migrations.
---

# AI Usage Read Compatibility

## Behavior Boundary

The report rules module owns the existing time-window, sum, grouping, sorting,
and recent-row projection. The application module coordinates the row query and
budget status through a provider-neutral port. The legacy adapter keeps the
existing Supabase query and `budgetStatus` helper. The route only maps the
existing JSON response and query-error status.

## Invariants

1. The row query still selects all columns from `ai_usage_logs`, orders by
   `created_at` descending, and limits the result to 2000 rows.
2. Query errors still return `{ error: message }` with status 400; a thrown
   Supabase construction failure and a thrown budget lookup remain outside the
   new route error boundary.
3. Total, 30-day, and 7-day summaries preserve the existing token/cost
   coercion. Operation and model groups remain sorted by descending cost, and
   `recent` remains the first 50 rows in query order.
4. The response remains `{ budget, total, last30, last7, operations, models,
   recent }`; budget values come unchanged from `budgetStatus`.
5. No UI, write-path, pricing, cache, row/schema, or migration behavior changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/ai-usage-report-rules.test.ts
    - tests/unit/ai-usage-read-application.test.ts
    - tests/unit/ai-usage-legacy-read-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `summarizeAiUsage`, `runAiUsageRead`, and
  `createLegacyAiUsageReadAdapter` through the AI usage route; the adapter is
  the only new caller of the existing read and budget helpers.
- Full verification at `13daf2d` plus this checkpoint: 52 Vitest files / 319
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  read-boundary cutover; only transient Next.js development-tool nodes differed
  on reload.

## Intentional Changes

- AI usage aggregation is now a pure, deterministic module with an injectable
  clock, and row/budget access is behind an explicit port.
- Existing Supabase rows, budget helper semantics, response JSON, and dashboard
  rendering remain compatibility contracts.
