---
schema_version: behavior-contract/v1
id: kv.support.daily-report-rules
title: Amber Support Daily Report Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate deterministic Support reporting rules from database and provider effects.
  non_goals:
    - Change Support webhook relay behavior.
    - Change cron or manual-run security, HTTP status, or response bodies.
    - Change database tables, query filters, limits, row shapes, or timestamps.
    - Change OpenAI request content, model, usage logging, LINE rendering, or delivery.
    - Add migrations, deduplication, outbox delivery, runtime cutover, or real traffic.
    - Change any browser UI, copy, state, layout, or interaction.
---

# Amber Support Daily Report Compatibility

## Behavior Boundary

In scope is deterministic interpretation of Amber's settings, the rolling
24-hour cutoff, unique-customer selection, subscriber-name fallback, customer
grouping, message truncation, raw brief, empty-day copy, AI fallback, and LINE
delivery metadata.

Support remains its own business module. It does not inherit Vivian's
activities, status vocabulary, grouping rules, or scheduled workflow merely
because both produce a daily report.

## Consumers And Entrypoints

- `GET /api/cron/support-daily-report`
- `POST /api/agents/support/report-now`
- `src/lib/support-daily-report.ts#runSupportDailyReport`
- `src/modules/support/daily-report.ts`
- `src/modules/support/reporting-ports.ts`
- `src/modules/support/reporting-application.ts#runSupportReport`
- `src/adapters/support/legacy-support-report-adapters.ts`
- `line_agents`, `line_support_conversations`, `line_subscribers`, and
  `line_agent_activity` remain legacy adapter concerns.

## Inputs And State

- Amber's optional Agent row has `enabled` and untyped `settings`.
- Customer messages contain `line_user_id`, `text`, and `occurred_at`.
- Subscriber display names are a lookup keyed by LINE user ID.
- The caller supplies the current date so the pure module does not own a clock.

## Outputs And Side Effects

- Pure functions return a disabled, missing-recipient, or deliver plan.
- Pure functions calculate the same rolling 24-hour ISO cutoff.
- Unique customer IDs retain first-message order for the subscriber lookup.
- Preparation returns customer/message counts, the exact raw brief or
  empty-day copy, and the exact date label.
- The module performs no I/O, environment access, database access, provider
  call, logging, or rendering.

## UI States

No browser-visible state changes. Amber's page, manual report action,
navigation, Agent catalog, and all loading, ready, empty, and error
presentation remain frozen.

## Invariants

1. Explicit disablement and missing-recipient outcomes preserve exact copy.
2. `reportTo` is trimmed; unsupported styles fall back to `flex`.
3. The cutoff is exactly 24 hours before the supplied clock instant.
4. Customer IDs are unique and ordered by first message occurrence.
5. Message and customer group order remain the ascending query order.
6. Display names use the current truthy lookup; otherwise the first ten ID
   characters plus `…` appear in `未命名客戶（...）`.
7. Each customer contributes at most eight lines; every line keeps only the
   first 120 UTF-16 code units, matching existing `slice`.
8. Counts, punctuation, whitespace, empty-day copy, LINE title, and pink accent
   remain byte-for-byte compatible.
9. Empty days skip subscriber and AI work; null AI summaries use the raw brief.
10. The Support relay webhook remains outside this change.
11. Application ordering remains: config, cutoff, customer messages, optional
    subscriber names, preparation, optional summary, delivery, then success
    activity. Only delivery errors become the current failed result; earlier
    port errors still propagate.

## Acceptance Examples

Given a padded recipient and `buttons`, delivery planning trims the recipient
and preserves the current Support title and accent.

Given interleaved messages from two customers, unique IDs and report groups
retain first occurrence order while each customer's messages retain query
order.

Given no subscriber name, the report uses the current truncated LINE user ID
fallback.

Given no messages, the report contains the current no-new-message copy with
zero customers and no raw brief.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/support-reporting-rules.test.ts
    - tests/unit/support-reporting-legacy-adapters.test.ts
    - tests/unit/support-reporting-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- Pre-change CodeGraph maps `runSupportDailyReport` to the cron and manual
  routes.
- The Support-local `summarizeWithAI` maps through the same server owner to
  those routes.
- Direct source mapping records `line_agents`, `line_support_conversations`,
  `line_subscribers`, `line_agent_activity`, OpenAI, and LINE ownership.
- Post-change CodeGraph maps `runSupportReport` to the Support application and
  server compatibility facade; `SupportReportPorts` maps to the module, legacy
  adapter, and facade. Direct `rg` retains both routes as
  `runSupportDailyReport` consumers.
- `npm run verify:full` passed with 28 Vitest files / 209 tests, a 93-page
  production build, and 130 Playwright smoke cases.
- Real Chrome checks before and after every Support reporting stage retained
  the Agent catalog count and the `通用型`, `專業型`, and `超級 Agent` tier labels.
- Checkpoint commits: `7447a32`, `3d403b4`, `d6a0821`.

## Intentional Changes

- Deterministic Support report rules become Support-owned pure functions.
- The legacy server function delegates to those rules while retaining all I/O.
- Support-owned ports now describe repository, summary, and delivery
  capabilities; the legacy adapter preserves Dennis's current Supabase,
  OpenAI, LINE, and usage-log implementations.
- Support application orchestration is executable against fake ports; the
  legacy server owner only binds adapters and the system clock.

## Open Questions

- Production schedule ownership and replay behavior remain unverified.
- Outbox, deduplication, artifacts, and cutover require later schema/runtime
  evidence.
