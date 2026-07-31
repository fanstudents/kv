---
schema_version: behavior-contract/v1
id: kv.cron.auth.compatibility
title: Cron Authentication Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Centralize the existing x-cron-key decision rule used by scheduled API routes.
  non_goals:
    - Change the CRON_SECRET value, header name, error messages, or HTTP statuses.
    - Change any cron job's business workflow, provider calls, or persistence rows.
    - Add scheduling infrastructure, credential rotation, or a security policy migration.
---

# Cron Authentication Compatibility

## Behavior Boundary

`src/modules/cron/auth-rules.ts` owns the pure decision for the existing
`CRON_SECRET` and `x-cron-key` contract. Cron routes keep their own workflow
and HTTP response mapping. The knowledge-base recheck rule remains as a
compatibility-named wrapper so existing imports and tests continue to work.

## Invariants

1. An undefined or empty `CRON_SECRET` returns `{ kind: "misconfigured",
   message: "server misconfigured: CRON_SECRET not set", status: 503 }`.
2. A missing or non-equal `x-cron-key` returns `{ kind: "unauthorized",
   message: "unauthorized", status: 401 }`.
3. Only an exact secret match returns `{ kind: "authorized" }`.
4. The rule is used by `support-daily-report`, `team-lead-report`,
   `metric-snapshot`, `visit-timeout`, and the existing `kb-recheck` wrapper.
5. Authorized cron workflows, provider/data side effects, response payloads,
   route limits, schema assumptions, and all UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/cron-auth-rules.test.ts
    - tests/unit/knowledge-base-recheck-rules.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseCronAuth` to the four migrated cron routes and the
  knowledge-base compatibility wrapper; route-specific workflows remain
  outside the shared rule.
- Full verification at `50c1b2f`: 168 Vitest files / 516 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  cron boundary; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Cron authentication decisions are now one pure, reusable rule with a small
  unit-test surface, while each route remains responsible for its own work.
- Existing secrets, headers, messages, statuses, workflows, data formats, and
  UI behavior remain unchanged.
