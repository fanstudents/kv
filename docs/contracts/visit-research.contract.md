---
schema_version: behavior-contract/v1
id: kv.visit.research.compatibility
title: Visit Research Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Visit research request mapping, contact lookup, provider orchestration, and profile-list side effects from the route.
  non_goals:
    - Change the Visit research API envelopes, status codes, or UI behavior.
    - Change contacts, contact_profiles, agent_runs, or line_agent_activity row shapes.
    - Introduce a contact-schema migration, provider migration, or reconciliation job.
---

# Visit Research Compatibility

## Behavior Boundary

The rules module owns the existing request normalization. The application
module owns contact enrichment, validation, research orchestration, and the
post-success profile read. The legacy adapter keeps the existing Supabase
contact lookup and `contact-research` helper behind a provider-neutral port.
Routes retain JSON parsing and HTTP response mapping.

## Invariants

1. GET still returns `{ profiles: await listContactProfiles(10) }` with the
   existing profile data shape and no additional transformation.
2. POST maps `contactId` to a string or `null`, trims `name` and `company`,
   and initializes `title` and `email` as `null`.
3. When `contactId` is truthy, the legacy lookup still selects
   `name,company,title,email` from `contacts`, filters with `eq("id", contactId)`,
   and uses `maybeSingle()`. Contact values override the request where the
   legacy flow did so; missing name/company values fall back to the request.
4. A missing final name returns HTTP 400 with the exact message
   `缺少要調查的對象姓名` and does not invoke the research provider.
5. The existing `researchContact` helper receives the normalized contact
   fields. A null provider result returns HTTP 502 with the exact message
   `調查失敗，請稍後再試`.
6. Success returns `{ id, profiles }`, where `profiles` is the unchanged
   `listContactProfiles(10)` result. Existing `contact_profiles`, `agent_runs`,
   and `line_agent_activity` side effects remain owned by the legacy helper.
7. Existing API access behavior, persistence rows, schema assumptions, and
   Visit UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-research-rules.test.ts
    - tests/unit/visit-research-application.test.ts
    - tests/unit/visit-research-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseVisitResearchRequest`, `runVisitResearchRead`, and
  `runVisitResearch` to the research route; `createLegacyVisitResearchAdapter`
  is the contact/provider boundary and `VisitResearchPort` is the dependency
  contract.
- Full verification at `7a40149`: 167 Vitest files / 513 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Visit research boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Visit research request mapping, contact enrichment, orchestration, and
  provider access are now independently testable and replaceable.
- Existing contact/profile formats, helper side effects, response data/status,
  and UI behavior remain unchanged.
