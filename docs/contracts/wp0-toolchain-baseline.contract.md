# WP0-0A Toolchain Baseline Behavior Contract

Status: verified  
Baseline commit: `359d4c98035267df2711a376a439fdbc5720cc76`  
Implementation branch: `codex/kv-wp0-toolchain`

## Scope

This change establishes the first refactoring safety rail:

- deterministic lint, route-type generation, TypeScript checking, tests, and production build commands;
- a CI workflow that runs those checks sequentially;
- a minimal Vitest harness and an agent-registry characterization test;
- removal of the existing React lint errors without changing rendered UI or user-visible behavior.

## Non-goals

- No visual, copy, route, responsive-layout, animation, or interaction redesign.
- No API contract, database schema, authentication, agent workflow, or business-rule change.
- No architectural module extraction yet.
- No end-to-end browser baseline yet; that belongs to WP0-0C.
- No vulnerability remediation in this batch.

## Consumers and entrypoints

| Consumer | Entrypoint | Expected behavior |
| --- | --- | --- |
| Engineer | `npm run lint` | Reports no lint errors or warnings. |
| Engineer | `npm run typecheck` | Generates Next route types, then runs TypeScript without emitting files. |
| Engineer | `npm test` | Runs deterministic unit and integration tests once. |
| Engineer | `npm run test:watch` | Runs Vitest in watch mode. |
| Pull request / main push | `.github/workflows/ci.yml` | Installs from the lockfile and runs lint, typecheck, tests, and build in sequence. |

## Inputs, state, outputs, and side effects

- The lockfile is the dependency authority used by local `npm ci` and CI.
- Next route types under `.next/types` are generated before `tsc`.
- Tests run in a Node environment unless a later suite explicitly introduces a browser-like environment.
- CI has read-only repository content permission and performs no deployment.
- The production application receives no new runtime dependency.
- The existing Supabase runtime dependency is pinned to its baseline lockfile version, `2.110.6`, so installing Vitest cannot silently upgrade the SDK.
- Playwright and MSW are intentionally deferred until WP0-0C and WP0-0D respectively, so this batch does not carry unused tooling.

## Preserved UI and behavior invariants

1. All existing routes, DOM structure, classes, copy, assets, colors, spacing, responsive breakpoints, and animations remain unchanged.
2. The mobile sidebar opens and closes with the same controls and closes after navigation.
3. The LINE test-recipient field still starts from the stored ID when available, otherwise the existing default; editing and test-send behavior remain unchanged.
4. Metric-history consumers still receive cached points immediately and otherwise receive loading state followed by fetched points.
5. Subscriber row expansion and tag-filter toggles keep the same Set membership behavior.
6. The agent catalog still contains twelve unique slugs and keeps the existing marketing/admin classification.

## Source mapping and impact evidence

| Contract area | Current source | Known consumers / impact |
| --- | --- | --- |
| LINE test-recipient state | `src/components/agents/AgentPageShell.tsx` | Shared by 12 agent routes through `AgentPageShell` / `MarketingAgentShell`; CodeGraph impact returned 23 affected symbols. |
| Mobile navigation state | `src/components/layout/Sidebar.tsx` | Dashboard layout and all nested dashboard routes; CodeGraph impact returned 4 affected symbols. |
| Goal-history cache state | `src/lib/goal-history.ts` | `GoalTrend` and `GoalBar`; CodeGraph impact returned 6 affected symbols. |
| Subscriber toggles | `src/app/(dashboard)/subscribers/page.tsx` | Subscriber management page; CodeGraph impact returned 2 affected symbols. |
| Agent-registry baseline | `src/lib/agent-data.ts` | Sidebar, catalog, agent pages, and agent lookups; guarded initially by `tests/unit/agent-data.test.ts`. |
| Quality commands | `package.json`, `vitest.config.mts` | Local development and CI. |
| Pull-request gate | `.github/workflows/ci.yml` | Pull requests and pushes to `main`. |

CodeGraph evidence is complemented by text search because static data consumers may not always appear in the graph.

Post-change CodeGraph sync indexed 212 files, 2,027 nodes, and 4,295 edges. Its `affected` query found no existing test files connected to the four changed product files. That is expected because this repository previously had no tests, and it confirms that WP0-0C must add browser characterization for these UI-facing behaviors instead of treating the new registry unit test as parity coverage.

## Acceptance examples and test mapping

| Example | Evidence |
| --- | --- |
| A pull request with a lint error fails before build. | CI step order plus a clean `npm run lint`. |
| Next generated route types exist before TypeScript checks them. | `npm run typecheck` runs `next typegen` before `tsc --noEmit`. |
| Agent slugs accidentally duplicate or the catalog count changes. | `tests/unit/agent-data.test.ts` fails and requires an intentional contract update. |
| Marketing classification changes accidentally. | `tests/unit/agent-data.test.ts` fails. |
| Current production bundle no longer compiles. | `npm run build` and the CI build step fail. |

## Baseline and intentional changes

Before this batch:

- no general pull-request CI workflow existed;
- no test runner or tests existed;
- no named type-generation or typecheck command existed;
- lint reported three errors and two warnings;
- sequential `next typegen` followed by `tsc --noEmit` passed;
- running Next build and type generation concurrently was shown to race on `.next/types`, so CI must remain sequential.

Intentional implementation changes are limited to tooling and equivalent state derivation needed to satisfy the existing React lint rules. Any UI or business-behavior difference is a regression.

Final local verification on 2026-07-31:

- `npm ci`: reproduced the dependency tree from the lockfile;
- `npm run lint`: passed with zero findings;
- `npm run typecheck`: Next route types generated and TypeScript passed;
- `npm test`: one file and two tests passed with no runner warnings;
- `npm run build`: Next.js 16.2.10 production build passed and generated 93 static pages.

## Open questions deferred to later work packages

- Browser and screenshot baseline routes, viewport matrix, and fixture strategy: WP0-0C.
- API and external-provider mocking conventions using MSW: WP0-0D.
- Coverage thresholds: set after characterization suites cover meaningful boundaries; do not optimize an empty percentage.
