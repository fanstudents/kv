alter table "public"."pending_invites"
  add column if not exists "fulfilment_phase" text,
  add column if not exists "fulfilment_error" text;

alter table "public"."pending_invites"
  drop constraint if exists "pending_invites_fulfilment_phase_check";

alter table "public"."pending_invites"
  add constraint "pending_invites_fulfilment_phase_check"
  check (
    "fulfilment_phase" is null
    or "fulfilment_phase" = any (
      array['calendar_created'::text, 'email_sent'::text, 'line_notified'::text, 'completed'::text]
    )
  );
