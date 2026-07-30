# Productization Refactor Checkpoints

This file is the repository-local handoff ledger for the productization
refactor. The external canonical plan remains
`D:/_CabLate_Agents/coder/projects/kv/productization-plan.md`.

## Execution Rule

Every stage must:

1. capture a real Chrome UI baseline before the change;
2. record CodeGraph and source-reference impact before the change;
3. preserve Dennis's current database, API, provider, and UI contracts unless
   an intentional change is separately approved;
4. run focused tests plus lint, route-aware typecheck, and production build;
5. capture Chrome and CodeGraph evidence after the change;
6. create a checkpoint commit before starting the next stage.

## Checkpoints

| Commit | Stage | Evidence |
|---|---|---|
| `657b08f` | Productization baseline and Visit Runtime | WP0/WP1 contracts, characterization, Runtime Kernel, Visit pure core |
| `e870d87` | Visit rollout application boundary | Legacy default, record-only shadow evaluation |
| `c381d1e` | Visit LINE input normalization | Pure inbound payload normalization |
| `913587c` | Visit text classifier adoption | Existing decision precedence preserved |
| `03b28b6` | Visit webhook dispatch normalization | Existing handlers and unknown-user fallback preserved |
| `e45fd67` | Visit contact persistence mapping | Exact legacy `contacts` insert shape |
| `1e2105a` | Visit invite persistence mapping | Exact legacy `pending_invites` insert shape |
| `cdcb98a` | Visit offer resolution mapping | Accepted/declined/timeout legacy vocabulary preserved |
| `8de2f39` | Visit approval write mapping | Status-only and revision-only patches |
| `f7feda9` | Visit public response write mapping | Compare-and-set confirmation and fulfilment patches |
| `4657680` | Visit public response rules | Choice, location, and slot selection pure logic |
| `7efd8de` | Visit provider port | Visit-owned provider contract and legacy OpenAI/Google adapter |

## Current Verification

At `7efd8de` plus this documentation stage:

- `npm run verify:full` passed;
- 18 Vitest files / 156 tests passed;
- production build generated 93 pages;
- 130 Playwright smoke cases passed;
- Chrome retained the Agent catalog count and tier labels;
- no production Supabase schema or data was read or changed.

## Current Boundary

Safe TypeScript, compatibility, provider-port, and route strangler work may
continue against the existing row formats. Database migrations, repository
cutover, and real canary traffic remain deferred until an authorized
production-like schema export and provider environment are available.
