# Contact tag compatibility contract

## Scope

This boundary centralizes the existing contact-tag capability used by the LINE
webhook, timeout cron, TV idle data source, and Meeting context. It is an
adapter seam only; it does not introduce a new tag model or change the legacy
`contacts.tags` / subscriber-tag formats.

## Owner

- `ContactTagPort` exposes `list` and `add` without leaking a Supabase client
  to callers.
- `createLegacyContactTagAdapter` binds those methods to the existing
  `getAvailableTags` and `addContactTag` helpers with one lazy legacy client.
- Callers retain ownership of when to show tag quick replies, which contact to
  update, and how tag output is rendered in their existing workflows.

## Preserved contract

- `list` keeps the starter labels, existing `line_subscribers.tags` and
  `contacts.tags` discovery, de-duplication, and twelve-label cap.
- `list` keeps the helper's best-effort fallback to starter labels when reads
  fail.
- `add` keeps duplicate suppression, append order, `contacts.tags` update
  shape, and the helper's `[]` fallback on any failure.
- Existing route/adapter error boundaries, UI quick replies, Meeting context
  wording, TV output, HTTP responses, and database schema remain unchanged.

## Verification evidence

- Code checkpoint: `8143732`.
- Focused adapter and existing TV adapter tests passed; full verification:
  181 Vitest files / 539 tests, 93-page production build, and 130 Playwright
  smoke cases passed.
- Chrome application-only DOM snapshots matched exactly before and after
  (`3642` chars); catalog count and tier markers remained present. Reload-only
  Next.js Dev Tools/alert nodes were excluded from the comparison.
- CodeGraph maps the new adapter to all four existing consumers; direct
  `contact-tags` helper imports remain only inside the legacy adapter.

## Deferred

Tag repository replacement, schema migration, taxonomy changes, reconciliation,
and production traffic evidence remain deferred.
