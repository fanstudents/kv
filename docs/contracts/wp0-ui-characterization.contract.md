---
schema_version: behavior-contract/v1
id: kv.wp0.ui-characterization
title: KV UI Surface And Browser Characterization
status: active
owner_surface: shared
change_context:
  type: refactor
  reason: Freeze the existing browser-visible product before moving implementation boundaries.
  non_goals:
    - Redesign or improve any existing UI or UX.
    - Change routes, copy, styling, responsive behavior, or business semantics.
    - Exercise real external providers from automated tests.
---

# KV UI Surface And Browser Characterization

## Behavior Boundary

This contract inventories every App Router page and the intentionally exposed
static HTML surfaces. It adds smoke, interaction, and representative visual
baselines. The application implementation is out of scope.

## Consumers And Entrypoints

- Public browser surfaces: `/`, `/login`, `/agents-catalog` and its three
  category routes, plus six public static routes backed by five HTML artifacts.
- Protected browser surfaces: all dashboard pages, all twelve installed Agent
  pages, Meeting, TV, Universe, and Super Agent pages.
- Engineers: `tests/fixtures/ui-surfaces.ts`, the inventory unit test, and the
  Playwright suite.
- CI: the browser-characterization job after the normal quality job.

## Inputs And State

- Public tests need no credentials.
- Protected tests use test-only `AUTH_SECRET` and `ADMIN_PASSWORD` values
  supplied by the Playwright web server. They never use production credentials.
- Provider-backed requests are replaced by deterministic browser-test fixtures
  where necessary.
- Desktop baseline viewport: 1440 × 900.
- Mobile baseline viewport: 390 × 844.

## Outputs And Side Effects

- Browser tests may create screenshots, traces, and Playwright reports under
  ignored test-output directories.
- Tests may write browser-local state and test-only cookies.
- Tests must not write production data, call LINE, Google, OpenAI, Teachify, or
  mutate a real Supabase project.
- No application DOM, CSS, copy, API, or database implementation is changed by
  this work package.

## UI States

- First paint: route renders without an uncaught page error or horizontal
  overflow at its declared viewport.
- Loading: existing loading indicators and layout are preserved.
- Ready: stable route-specific landmark or heading is visible.
- Empty/error: existing empty and error states are preserved when fixtures
  select them.
- Disabled: existing disabled controls remain disabled under the same inputs.
- Teardown: test-only cookies, routes, and browser contexts do not survive the
  suite.

## Invariants

1. Every `src/app/**/page.tsx` file appears exactly once in the surface manifest.
2. Adding or deleting a page requires an explicit manifest decision.
3. Public routes stay public; protected routes redirect an anonymous browser to
   `/login`.
4. Screenshot updates are product decisions, not automatic refactor fallout.
5. Browser tests never depend on real provider availability.
6. Chrome manual checks bracket every later UI-facing refactor batch.

## Acceptance Examples

```gherkin
Given an anonymous visitor opens /dashboard
When the proxy evaluates the request
Then Chrome arrives at /login
And the existing login heading and password field are visible
```

```gherkin
Given the public Agent catalog is loaded at desktop width
When the page reaches its ready state
Then all three Agent levels and the current 25-Agent summary are visible
And the screenshot matches the approved baseline
```

```gherkin
Given an engineer adds a new page.tsx route
When npm test runs
Then the UI surface inventory test fails
Until the engineer classifies the route and its baseline responsibility
```

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/ui-surface-inventory.test.ts
  e2e:
    - tests/e2e/public-surfaces.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/visual-baselines.spec.ts
  manual:
    - Chrome before/after checks of the login page and Agent catalog for WP0.
```

## Evidence

- Pre-change Chrome check on 2026-07-31:
  - `/dashboard` redirected to `/login`;
  - login heading, password textbox, disabled login button, and protection copy
    were present;
  - `/agents-catalog` rendered the three levels and 25-Agent inventory.
- CodeGraph pre-change impact:
  - `MarketingAgentShell` reached five marketing Agent page functions;
  - CodeGraph did not reliably recover route/proxy consumers, so route-source
    enumeration and browser evidence are authoritative complements.
- Automated evidence:
  - all 35 App Router pages are classified exactly once;
  - all six public static routes are classified;
  - five Vitest tests passed, including inventory completeness and uniqueness;
  - 71 desktop Playwright smoke cases passed across public, anonymous protected,
    test-authenticated protected, and static surfaces;
  - 12 representative desktop/mobile visual snapshots were generated and an
    immediate no-change rerun passed.
- Post-change Chrome check on 2026-07-31:
  - `/login` retained its heading, password textbox, disabled login button, and
    browser-visible layout;
  - `/agents-catalog` retained its title, three levels, inventory, layout, and
    responsive presentation;
  - no route, copy, DOM, styling, responsive, or interaction change was found.
- The Playwright harness uses `localhost` consistently because mixing
  `127.0.0.1` with the application's canonical host caused the root/static
  rewrite to self-proxy during the first harness run. This was a test-harness
  correction; production routing was not changed.

## Intentional Changes

None. Any browser-visible difference is a regression for this work package.

## Open Questions

- Production-authenticated provider states require a separate, authorized
  staging run and are not part of the deterministic local suite.
- More visual baselines will be promoted from smoke coverage when their owning
  module enters a refactor work package.
