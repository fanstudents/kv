-- Keep the legacy visit_offers status vocabulary. Timeout is represented by
-- declined plus an explicit recovery checkpoint so old consumers stay valid.
alter table "public"."visit_offers"
  add column if not exists "timeout_phase" text,
  add column if not exists "timeout_error" text;

alter table "public"."visit_offers"
  drop constraint if exists "visit_offers_timeout_phase_check";

alter table "public"."visit_offers"
  add constraint "visit_offers_timeout_phase_check"
  check (
    "timeout_phase" is null
    or "timeout_phase" = any (
      array[
        'resolved'::text,
        'activity_recorded'::text,
        'line_notified'::text,
        'completed'::text
      ]
    )
  );

create index if not exists "visit_offers_timeout_recovery_idx"
  on "public"."visit_offers" (resolved_at)
  where "timeout_phase" is not null and "timeout_phase" <> 'completed';
