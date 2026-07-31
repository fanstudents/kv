# Visit settings compatibility contract

## Scope

This contract covers the Visit settings consumed by the LINE webhook when it
looks up calendar ranges, meeting defaults, invite sender text, and approval
policy. The refactor introduces a port and a legacy adapter without changing
the existing row shape or provider.

## Owner boundary

- `src/modules/visit/settings-ports.ts#VisitSettingsPort` owns the stable
  application-facing settings shape.
- `src/adapters/visit/legacy-settings-adapter.ts#createLegacyVisitSettingsAdapter`
  owns the current Supabase/helper binding.
- `src/lib/visit-settings.ts#getVisitAgentSettings` remains the compatibility
  implementation until a schema/provider replacement is explicitly approved.

## Preserved behavior

The adapter must preserve the existing query and defaults exactly:

- query `line_agents.settings` where `slug = "visit"`, using the existing
  `single()` behavior and error propagation;
- range defaults of 3 and 7 days;
- meeting duration of 60 minutes and meeting type `"喝咖啡"`;
- working hours `09:00` through `18:00`;
- sender name `"樊松蒲 Dennis"`;
- `requireApproval` defaulting to `true`.

The LINE webhook keeps the existing settings lookup order, calendar request,
invite rendering, revision flow, reply text, provider calls, runtime/activity
tracking, and failure isolation. No database migration, row rewrite, or UI
change is part of this boundary.

## Verification evidence

- Code checkpoint: `079f17c`.
- `npm run verify:full`: 183 Vitest files / 543 tests, 93 production pages,
  and 130 Playwright smoke cases passed.
- Chrome reload comparison retained the protected Agent catalog count and all
  tier labels. Application-only DOM snapshots were exactly equal before and
  after; only reload-only Next.js Dev Tools/alert nodes were normalized.
- CodeGraph maps `createLegacyVisitSettingsAdapter` to the LINE webhook and
  keeps `getVisitAgentSettings` behind the adapter for that route. `rg`
  confirms the route has no direct settings-helper or Supabase import.

## Deferred work

Replacing the settings repository, changing the settings schema/defaults,
provider cutover, migration/reconciliation, and production canary evidence are
deferred until an authorized production-like schema export and environment are
available.
