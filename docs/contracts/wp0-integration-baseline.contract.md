---
schema_version: behavior-contract/v1
id: kv.wp0.integration-baseline
title: KV Integrated Quality Gate
status: active
owner_surface: shared
change_context:
  type: refactor
  reason: Provide one repeatable gate for all non-database productization work.
  non_goals:
    - Treat the known schema-rehearsal failure as passing.
    - Exercise public webhooks or real provider calls.
    - Change application behavior or UI.
---

# KV Integrated Quality Gate

## Behavior Boundary

This contract composes lint, route-aware typecheck, unit/inventory tests,
production build, anonymous API access checks, browser smoke coverage, and
manual Chrome parity into one handoff gate.

## Consumers And Entrypoints

- Local engineers: `npm run verify` and `npm run verify:full`.
- CI: locked install, static/unit/build gate, then isolated browser smoke.
- Future work packages: the same gate plus package-specific tests and visuals.

## Inputs And State

- Node.js 22 and the committed lockfile.
- Browser tests use a production build on localhost port 3100.
- Test-only authentication is isolated to the Playwright process.
- Provider credentials are deliberately empty.

## Outputs And Side Effects

- Next build output, Playwright reports, traces, and failure screenshots.
- No provider calls and no production data writes.
- Visual snapshots only change through the explicit update command.

## Invariants

1. `verify` passes lint, generated route types, TypeScript, Vitest, and build.
2. `verify:full` additionally passes all non-visual Playwright smoke checks.
3. Every session API method returns the existing anonymous 401 JSON contract.
4. Public callbacks/webhooks are inventoried but not invoked by the smoke suite.
5. A refactor package cannot claim parity without its Chrome before/after check.

## Test Mapping

```yaml
test_mapping:
  commands:
    - npm run verify
    - npm run verify:full
  e2e:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/public-surfaces.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/visual-baselines.spec.ts
```

## Evidence

- CodeGraph only links `proxy` to its source file and links
  `verifySessionToken` to `proxy`; the generated API inventory is the required
  complement for exhaustive access testing.
- Pre-change Chrome check on 2026-07-31 confirmed the Agent catalog route,
  three tiers, and 25-Agent heading.
- Full verification on 2026-07-31:
  - lint and generated-route typecheck passed;
  - five Vitest files and 71 tests passed;
  - the production build passed and generated 93 pages;
  - 130 non-visual Playwright cases passed, including all 59 session API
    method/access combinations and the existing 71 browser surface cases.
- Post-change Chrome check confirmed `/agents-catalog` and `/login` retained
  their pre-change headings, controls, route, tiers, and inventory.

## Intentional Changes

- Added anonymous 401 integration coverage for every session API method.
- Added single-command verification scripts.
- No application implementation changed.
