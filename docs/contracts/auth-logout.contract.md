---
schema_version: behavior-contract/v1
id: kv.auth.logout.compatibility
title: Auth Logout Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate logout cookie-expiration policy from the route.
  non_goals:
    - Change the session cookie name, value, path, or expiration behavior.
    - Change the login UI, middleware behavior, or response shape.
    - Add an external identity provider, session store, or migration.
---

# Auth Logout Compatibility

## Behavior Boundary

The rules module owns the provider-neutral cookie-expiration policy. The
application module returns that policy to the route. The route remains the
Next.js boundary that creates the JSON response and writes the `kv_session`
cookie.

## Invariants

1. `POST /api/auth/logout` returns `{ ok: true }`.
2. The session cookie is cleared with an empty value and `maxAge: 0`.
3. The cookie remains `httpOnly`, `sameSite: "lax"`, and `path: "/"`.
4. The `secure` attribute is false outside production and true in production.
5. No login UI, middleware, token format, response shape, or data format
   changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/auth-logout-rules.test.ts
    - tests/unit/auth-logout-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `buildLogoutCookiePolicy` through the logout rules,
  application, and route; `runLogout` has only the logout route as its caller.
- Full verification at `08dd6ee`: 106 Vitest files / 411 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Auth logout cutover; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Cookie-expiration policy is now unit-tested without importing Next.js.
- The existing route-level response and cookie write remain the public
  boundary; session ownership and data formats stay unchanged.
