---
schema_version: behavior-contract/v1
id: kv.wp0.api-journey-characterization
title: KV API, Journey, And Provider Boundary Characterization
status: active
owner_surface: shared
change_context:
  type: refactor
  reason: Make the current backend behavior navigable and testable before moving ownership.
  non_goals:
    - Change API paths, methods, response shapes, status codes, or authentication.
    - Call real Supabase, LINE, Google, OpenAI, Firecrawl, or Teachify services.
    - Introduce the future Runtime Kernel implementation.
---

# KV API, Journey, And Provider Boundary Characterization

## Behavior Boundary

This package records every App Router API handler, its current access boundary,
business family, and provider dependencies. It also captures the multi-endpoint
product journeys that must survive later ownership changes.

## Consumers And Entrypoints

- Browser and static clients calling the 56 routes under `src/app/api`.
- LINE and Teachify webhooks, public Visit response links, and cron invocations.
- Visit, Knowledge, Meeting, Chat, Support, Order, Goal, and dashboard features.
- Engineers using `tests/fixtures/api-surfaces.ts` and
  `tests/fixtures/product-journeys.ts` as the source-to-target map.

## Inputs And State

- Route paths and HTTP methods are read from source, not inferred from runtime
  logs.
- Access values mirror `src/proxy.ts`: session, public auth, webhook, callback,
  or cron.
- Provider labels describe current direct dependencies. They are not the
  desired architecture and do not imply a provider-specific Agent type.
- Journey fixtures use synthetic identifiers and content only.

## Outputs And Side Effects

- Inventory tests read source files and fail on unclassified route changes.
- Fixture tests do not issue HTTP requests or initialize provider SDKs.
- Production source code, data, routes, and external systems are unchanged.

## Invariants

1. Every `src/app/api/**/route.ts` appears exactly once.
2. Declared methods exactly match exported route methods.
3. Route patterns are unique and retain their current access classification.
4. Every journey step references an inventoried API or library symbol.
5. Provider side effects and failure semantics are explicit before extraction.
6. Event/callback/cron is an entrypoint type, not an Agent subtype.

## Acceptance Examples

```gherkin
Given a new API route is added under src/app/api
When npm test runs
Then the API inventory test fails
Until its methods, access boundary, family, and providers are classified
```

```gherkin
Given the Visit invite journey is inspected
When an engineer follows its fixture
Then the initiating webhook, public response callback, persistence, calendar,
email, LINE notification, and deferred research effects are all visible
```

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/api-surface-inventory.test.ts
    - tests/unit/product-journeys.test.ts
  manual:
    - Chrome before/after checks of /agents-catalog and /login.
```

## Evidence

- Pre-change Chrome check on 2026-07-31 confirmed `/agents-catalog` still
  rendered the 25-Agent inventory and all three tiers.
- CodeGraph impact:
  - `POST` identified 30 exported handlers and their route files;
  - `startVisitRun` reached the LINE webhook Visit image flow;
  - `knowledgeContext` reached both Agent Chat and Meeting realtime session;
  - `getAgentLiveContext` reached Agent Chat and Meeting realtime session.
- Direct source enumeration found 56 API route files. CodeGraph and source
  enumeration are intentionally paired because identical HTTP export names
  collapse semantic distinctions in symbol-only queries.
- Automated verification:
  - all 56 API source files are classified exactly once;
  - all exported HTTP methods match the manifest;
  - the 12 proxy-visible public API patterns are frozen;
  - Visit, Knowledge, and Meeting fixtures reference only inventoried routes or
    existing source files;
  - 63 focused Vitest cases, typecheck, lint, and `git diff --check` passed.
- Post-change Chrome check on 2026-07-31 confirmed both `/agents-catalog` and
  `/login` retained their pre-change headings, content, controls, and route.

## Intentional Changes

None. This package adds executable documentation only.

## Open Questions

- Real provider response variance and staging credentials remain outside this
  deterministic baseline.
- Database schema ownership remains blocked on WP0-0E schema evidence.
