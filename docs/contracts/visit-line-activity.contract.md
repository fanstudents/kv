# Visit LINE activity persistence compatibility contract

## Scope

This boundary isolates the legacy `line_agent_activity` insert used by the
main LINE webhook. It is a persistence seam, not a new activity model or a
change to the Visit workflow.

## Owner

- `VisitLineActivityPort` defines the activity record accepted by the Visit
  LINE flow.
- `createLegacyVisitLineActivityAdapter` is the current adapter and writes the
  unchanged record to the existing `line_agent_activity` table.
- The route remains the owner of business decisions, summary text, status
  selection, ordering, and best-effort/error handling around each write.

## Preserved contract

- `agent_slug` remains either `"visit"` for Visit activity or `null` for
  generic LINE webhook activity.
- `summary` text, interpolation, truncation, and language remain unchanged.
- `status` remains exactly `"success"`, `"failed"`, or `"pending"`.
- Each write still occurs at the same point in the existing handler and keeps
  the same awaited error propagation. The adapter adds no retry, swallowing,
  batching, ordering, or transaction behavior.
- Existing Supabase client construction and the legacy row shape remain in
  place; no migration or schema change is introduced.
- HTTP responses, LINE replies, Visit runtime projections, and all UI output
  remain unchanged.

## Verification evidence

- Code checkpoint: `26249da`.
- Focused adapter tests: 2 passed.
- Full verification: 179 Vitest files / 535 tests, 93-page production build,
  and 130 Playwright smoke cases passed.
- Chrome Agent catalog snapshot: exact and normalized DOM parity both true;
  catalog count and tier labels remained present.
- CodeGraph maps the new adapter to the LINE webhook route; the route has no
  direct `line_agent_activity` table writes.

## Deferred

Activity repository replacement, schema migration, event projection changes,
reconciliation, and production traffic evidence remain deferred.
