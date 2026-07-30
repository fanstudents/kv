---
schema_version: behavior-contract/v1
id: kv.wp4b.reporting-rules
title: Vivian Daily Reporting Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate deterministic reporting rules from scheduled transport and provider effects.
  non_goals:
    - Change cron authentication, manual-run authentication, HTTP status, or response bodies.
    - Change database tables, query filters, limits, row shapes, or timestamps.
    - Change OpenAI request content, model, usage logging, LINE rendering, or delivery.
    - Add migrations, schedule deduplication, an outbox, a runtime cutover, or real traffic.
    - Change any browser UI, copy, state, layout, or interaction.
---

# Vivian Daily Reporting Compatibility

## Behavior Boundary

In scope is the deterministic interpretation of Vivian's `line_agents`
settings, the rolling 24-hour cutoff, activity filtering and grouping, raw
brief construction, empty-day copy, AI-summary fallback, and final LINE
delivery metadata.

The legacy server owner continues to perform Supabase reads and writes, OpenAI
transport and usage logging, LINE rendering and delivery, and public result
mapping until later Reporting port and application stages.

## Consumers And Entrypoints

- `GET /api/cron/team-lead-report`
- `POST /api/agents/teamlead/report-now`
- `src/lib/team-lead-report.ts#runTeamLeadReport`
- `src/modules/reporting/daily-report.ts`
- `line_agents` and `line_agent_activity` remain legacy adapter concerns.

## Inputs And State

- Vivian's optional Agent row has `enabled` and untyped `settings`.
- Settings use the current `reportTo` and `pushStyle` keys.
- Activity rows use `agent_slug`, `occurred_at`, `summary`, and the current
  `success | failed | pending` status vocabulary.
- The caller supplies the current instant and the existing Agent display-name
  resolver so the pure module does not own clocks or presentation roster data.

## Outputs And Side Effects

- Pure functions return a disabled, missing-recipient, or deliver plan.
- Pure functions calculate the same rolling 24-hour ISO cutoff.
- Preparation returns meaningful activities, the exact raw brief or empty-day
  copy, and the exact date label.
- Finalization selects the AI summary when non-null and otherwise preserves the
  raw brief.
- The module performs no I/O, environment access, database access, provider
  call, logging, or rendering.

## UI States

No browser-visible state changes. The Vivian page, manual report action,
navigation, Agent catalog, loading, ready, empty, and error presentation remain
frozen.

## Invariants

1. An explicitly disabled Agent returns the existing disabled result before
   settings or activity are read.
2. `reportTo` is trimmed; missing or non-string recipients retain the existing
   missing-setting result.
3. Only `text`, `flex`, `confirm`, and `buttons` are accepted; all other values
   retain the `flex` fallback.
4. The query cutoff remains exactly 24 hours before the supplied clock instant.
5. Rows without an Agent slug and summaries containing `草稿狀態` are excluded.
6. Activity order remains query order; Agent order remains first occurrence;
   each Agent contributes at most the first six rows to the raw brief.
7. Counts, punctuation, newlines, status labels, empty-day copy, LINE title,
   and accent color remain byte-for-byte compatible.
8. A null AI summary uses the raw brief; an empty activity day never requests
   an AI summary.
9. Cron and manual routes keep their current security and HTTP mapping.

## Acceptance Examples

Given a disabled Vivian row, planning returns `disabled`.

Given an enabled row with a padded recipient and `buttons`, planning trims the
recipient and preserves the style and existing LINE metadata.

Given activities from multiple Agents with draft and missing-slug rows,
preparation removes the excluded rows, preserves grouping order, limits each
group to six entries, and returns the current counts and copy.

Given no meaningful activity, preparation returns the current standby message
and no raw brief.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/reporting-rules.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- Pre-change CodeGraph maps `runTeamLeadReport` to both Reporting routes.
- `agentDisplayName` is local to the same server owner and reaches both routes.
- The generic name `summarizeWithAI` is ambiguous in CodeGraph because Support
  owns a separate symbol; direct source mapping keeps this change scoped to
  `src/lib/team-lead-report.ts`.

## Intentional Changes

- Deterministic reporting rules become Reporting-owned pure functions.
- The legacy server function delegates to those rules while retaining all I/O.

## Open Questions

- The production schedule owner and delivery replay behavior remain unverified.
- Schedule deduplication, outbox delivery, and artifact persistence require
  later runtime/schema evidence.
