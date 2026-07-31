---
schema_version: behavior-contract/v1
id: kv.auth.login.compatibility
title: Auth Login Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate login input and auth decision from the route.
  non_goals:
    - Change the existing HMAC session format, cookie name, TTL, or password helper.
    - Change the login UI, response shape, or middleware behavior.
    - Add an external identity provider or migration.
---

# Auth Login Compatibility

## Behavior Boundary

The rules module owns request-body normalization. The application owns the
configured/invalid/success login decision through a provider-neutral port. The
legacy adapter keeps the existing environment checks, `verifyPassword`, and
`createSessionToken` helpers behind that port. The route remains responsible
for HTTP status mapping and setting the session cookie.

## Invariants

1. Invalid JSON, `null`, and primitive bodies are treated as empty objects;
   only a string `password` is passed to the application.
2. Missing `AUTH_SECRET` or `ADMIN_PASSWORD` returns HTTP 500 with the existing
   configuration message.
3. A missing or invalid password returns HTTP 401 with `{ error: "密碼錯誤" }`.
4. A valid password calls the existing `createSessionToken` helper and returns
   `{ ok: true }` with the same `kv_session` cookie attributes and TTL.
5. No login UI, middleware, token format, password helper, or response shape
   changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/auth-login-rules.test.ts
    - tests/unit/auth-login-application.test.ts
    - tests/unit/auth-login-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseLoginRequest`, `runLogin`, and
  `createLegacyLoginAdapter` through the Auth login modules, adapter, and
  route; the existing `verifyPassword`/`createSessionToken` helpers remain
  behind the adapter.
- Full verification at `cafa912`: 104 Vitest files / 408 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Auth login cutover.

## Intentional Changes

- Login request normalization and decision branches are now unit-tested and
  isolated behind a provider-neutral application boundary.
- The existing auth helpers, cookie contract, status codes, UI, and data format
  stay unchanged.
