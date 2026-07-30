---
schema_version: behavior-contract/v1
id: kv.wp0.schema-baseline
title: KV Database Surface And Migration Rehearsal Baseline
status: blocked
owner_surface: shared
change_context:
  type: refactor
  reason: Prove whether the repository can recreate the databases its code expects before schema refactoring.
  non_goals:
    - Connect to, reset, migrate, or otherwise mutate a remote Supabase project.
    - Invent production table definitions from application queries.
    - Repair schema drift before the production schema is exported.
---

# KV Database Surface And Migration Rehearsal Baseline

## Behavior Boundary

This contract maps literal Supabase table calls to their database owner and
records whether the repository contains a reproducible definition. It also
defines the safe local-only migration rehearsal.

## Consumers And Entrypoints

- Primary KV database through `src/lib/supabase.ts`.
- Read-only teaching-system database through `src/lib/teaching-system.ts`.
- Supabase Storage bucket `meeting-recordings`.
- RPC function `match_kb_chunks`.
- Engineers running `npm run schema:rehearse`.

## Inputs And State

- Supabase CLI is pinned to 2.110.0.
- Local rehearsal uses project id `kv`, PostgreSQL 17, and dedicated ports
  54420–54422.
- The command explicitly targets `--local`; no project is linked and no remote
  credentials are present.
- Current migration files are replayed in timestamp order.

## Outputs And Side Effects

- Local Docker containers and volumes may be created for project `kv`.
- The rehearsal may destroy and recreate only the local `kv` database.
- Production and the separately owned teaching-system database are untouched.

## Invariants

1. Every literal `.from("table")` reference is classified exactly once.
2. Primary and teaching-system tables never share an implicit migration owner.
3. Missing production definitions are blockers, not invitations to infer DDL.
4. Generated database types cannot be treated as authoritative until the
   production baseline is captured and the empty-database rehearsal passes.
5. `schema:rehearse` must remain explicitly local.

## Acceptance Examples

```gherkin
Given a clean local Supabase database
When all repository migrations are replayed
Then every primary KV table, storage bucket, function, policy, and grant exists
And generated TypeScript types can be reproduced
```

```gherkin
Given the current migration history
When the local rehearsal reaches 20260721_contacts_tags.sql
Then it fails because public.contacts was never created by an earlier migration
And no guessed contacts definition is added
```

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/database-surface-inventory.test.ts
  local:
    - npm run schema:rehearse
  manual:
    - Chrome before/after checks of /login and /agents-catalog.
```

## Evidence

- CodeGraph reports 178 affected symbols for `getSupabase`; database ownership
  is therefore a shared serial point, not a safe first refactor target.
- Direct source enumeration found 32 literal table references:
  - 28 belong to the primary KV database;
  - four belong to the independent read-only teaching-system database.
- Only 13 of the 28 primary tables have a `CREATE TABLE` migration in this
  repository. `contacts` and `knowledge_base` have alter-only migrations; 13
  more primary tables have no definition.
- Local empty-database rehearsal with Supabase CLI 2.110.0 and PostgreSQL 17:
  - `20260721_agent_live_task.sql` applied;
  - `20260721_contacts_tags.sql` failed with SQLSTATE `42P01`;
  - exact cause: `relation "public.contacts" does not exist`.
- Additional recorded drift:
  - code writes `kb_chunks.title`, `source_page`, and `embedding`, while the
    migration defines none of those columns and instead defines
    `embedding_json`;
  - code reads/writes `kb_sources.source_type`, `url`, `content_hash`, and
    `last_checked_at`, which are absent from the migration;
  - code calls `match_kb_chunks`, but no repository migration defines it;
  - no generated Supabase `Database` types exist, so clients use `any`.
- No Supabase access token, database URL, local project link, or remote
  credential was available. Production schema export is therefore not
  authorized or possible in this run.
- Automated verification: database inventory tests, typecheck, lint, dependency
  pin verification, and diff checks passed.
- Post-change Chrome check on 2026-07-31 confirmed `/login` and
  `/agents-catalog` retained the same visible headings, controls, inventory,
  access behavior, and route.

## Intentional Changes

- Added local-only Supabase configuration and pinned CLI tooling.
- Added executable database surface and migration-coverage documentation.
- No database schema or application behavior changed.

## Open Questions

- Obtain an authorized schema-only production export for project
  `ytrolpaeuckdwgvifdhl`, including public tables, functions, policies, grants,
  extensions, and Storage configuration.
- Confirm PostgreSQL major version from production before accepting the local
  PostgreSQL 17 rehearsal as parity evidence.
- Decide whether the teaching-system schema stays an external contract or gets
  its own generated read-only types.
