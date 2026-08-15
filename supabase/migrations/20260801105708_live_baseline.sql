-- KV / time_alert authoritative schema baseline and first clean-environment migration.
-- Captured read-only from Supabase project ytrolpaeuckdwgvifdhl at 2026-08-01T03:32:31.759628+00:00.
-- Schema only: no production business rows, auth users, secrets, or migration statement bodies.
-- Apply only to a clean Supabase environment. Do not run against the source production project.
-- Future schema changes belong in supabase/migrations as forward-only deltas.

set check_function_bodies = off;
set search_path = public, extensions;

-- Extensions
create extension if not exists "pg_stat_statements" with schema "extensions";
create extension if not exists "pgcrypto" with schema "extensions";
create extension if not exists "supabase_vault" with schema "vault";
create extension if not exists "uuid-ossp" with schema "extensions";
create extension if not exists "vector" with schema "extensions";

-- Public enum and domain types
create type "public"."user_role" as enum ('admin', 'user');

-- Sequences
create sequence "public"."metric_snapshots_id_seq" as bigint increment by 1 minvalue 1 maxvalue 9223372036854775807 start with 1 cache 1 no cycle;

-- Tables
create table "public"."agent_artifacts" (
  "id" uuid default gen_random_uuid() not null,
  "run_id" uuid,
  "agent_slug" text not null,
  "kind" text not null,
  "title" text not null,
  "content" text,
  "uri" text,
  "version" integer default 1 not null,
  "approved_by" text,
  "approved_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "meta" jsonb default '{}'::jsonb not null
);

create table "public"."agent_goals" (
  "id" text not null,
  "agent_slug" text not null,
  "metric_id" text not null,
  "target" numeric not null,
  "start_value" numeric default 0 not null,
  "start_date" date not null,
  "due_date" date not null,
  "cadence" text default 'monthly'::text not null,
  "note" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."agent_live_task" (
  "agent_slug" text not null,
  "step" integer default 0 not null,
  "status" text default 'active'::text not null,
  "caption" text,
  "image" text,
  "image_version" bigint default 0 not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."agent_memory" (
  "id" uuid default gen_random_uuid() not null,
  "scope" text default 'agent'::text not null,
  "agent_slug" text,
  "kind" text default 'episodic'::text not null,
  "content" text not null,
  "source_run_id" uuid,
  "level" smallint default 2 not null,
  "confidence" real default 0.6 not null,
  "expires_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "use_count" integer default 0 not null,
  "embedding_json" jsonb,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."agent_run_steps" (
  "id" uuid default gen_random_uuid() not null,
  "run_id" uuid not null,
  "node_id" text not null,
  "seq" integer default 0 not null,
  "status" text default 'running'::text not null,
  "input_summary" text,
  "output_summary" text,
  "tokens" integer default 0 not null,
  "cost_usd" numeric(10,6) default 0 not null,
  "duration_ms" integer,
  "started_at" timestamp with time zone default now() not null,
  "ended_at" timestamp with time zone
);

create table "public"."agent_runs" (
  "id" uuid default gen_random_uuid() not null,
  "agent_slug" text not null,
  "trigger" text default 'manual'::text not null,
  "trigger_ref" text,
  "goal_id" text,
  "status" text default 'running'::text not null,
  "error_kind" text,
  "error_detail" text,
  "started_at" timestamp with time zone default now() not null,
  "ended_at" timestamp with time zone,
  "cost_usd" numeric(10,6) default 0 not null,
  "total_tokens" integer default 0 not null,
  "summary" text,
  "meta" jsonb default '{}'::jsonb not null,
  "retry_count" integer default 0 not null,
  "next_retry_at" timestamp with time zone,
  "parent_run_id" uuid
);

create table "public"."agent_tasks" (
  "id" uuid default gen_random_uuid() not null,
  "from_agent" text,
  "to_agent" text not null,
  "title" text not null,
  "payload" jsonb default '{}'::jsonb not null,
  "state" text default 'queued'::text not null,
  "source_run_id" uuid,
  "handled_run_id" uuid,
  "due_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "attempts" integer default 0 not null,
  "last_error" text,
  "claimed_at" timestamp with time zone
);

create table "public"."ai_usage_logs" (
  "id" uuid default gen_random_uuid() not null,
  "agent_slug" text,
  "operation" text not null,
  "model" text not null,
  "prompt_tokens" integer default 0 not null,
  "completion_tokens" integer default 0 not null,
  "total_tokens" integer default 0 not null,
  "cost_usd" numeric(12,6) default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "run_id" uuid
);

create table "public"."broadcast_logs" (
  "id" uuid default gen_random_uuid() not null,
  "tag_filter" text,
  "channel_filter" text,
  "message_style" text default 'text'::text not null,
  "message_text" text not null,
  "recipient_count" integer default 0 not null,
  "success_count" integer default 0 not null,
  "failed_count" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."checklist_status" (
  "item_id" text not null,
  "done" boolean default false not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."contact_profiles" (
  "id" uuid default gen_random_uuid() not null,
  "contact_id" uuid,
  "invite_id" uuid,
  "person_name" text not null,
  "company" text,
  "company_summary" text,
  "person_summary" text,
  "links" jsonb default '[]'::jsonb not null,
  "highlights" jsonb default '[]'::jsonb not null,
  "talking_points" jsonb default '[]'::jsonb not null,
  "sources" jsonb default '[]'::jsonb not null,
  "confidence" real default 0.5 not null,
  "status" text default 'done'::text not null,
  "error_detail" text,
  "run_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."contacts" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "company" text,
  "title" text,
  "email" text,
  "phone" text,
  "source" text default 'line_card'::text not null,
  "line_user_id" text,
  "created_at" timestamp with time zone default now() not null,
  "tags" text[] default '{}'::text[] not null
);

create table "public"."kb_chunks" (
  "id" uuid default gen_random_uuid() not null,
  "doc_id" text not null,
  "chunk_index" integer default 0 not null,
  "content" text not null,
  "level" smallint default 1 not null,
  "token_estimate" integer,
  "embedding_json" jsonb,
  "updated_at" timestamp with time zone default now() not null,
  "embedding" vector(1536),
  "title" text,
  "source_page" integer
);

create table "public"."kb_citations" (
  "id" uuid default gen_random_uuid() not null,
  "doc_id" text not null,
  "agent_slug" text,
  "run_id" uuid,
  "question" text,
  "used_at" timestamp with time zone default now() not null
);

create table "public"."kb_sources" (
  "id" uuid default gen_random_uuid() not null,
  "filename" text not null,
  "mime_type" text,
  "byte_size" integer,
  "checksum" text not null,
  "page_count" integer,
  "char_count" integer,
  "status" text default 'parsed'::text not null,
  "error_detail" text,
  "extracted_text" text,
  "uploaded_by" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "meta" jsonb default '{}'::jsonb not null,
  "source_type" text default 'pdf'::text not null,
  "url" text,
  "content_hash" text,
  "last_checked_at" timestamp with time zone
);

create table "public"."knowledge_access" (
  "agent_slug" text not null,
  "max_level" smallint not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."knowledge_base" (
  "id" text not null,
  "title" text not null,
  "category" text not null,
  "level" smallint not null,
  "content" text,
  "builtin" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "status" text default 'published'::text not null,
  "kind" text default 'doc'::text not null,
  "updated_at" timestamp with time zone default now() not null,
  "version" integer default 1 not null,
  "owner" text,
  "review_at" date,
  "source_doc_id" uuid,
  "source_page" integer,
  "meta" jsonb default '{}'::jsonb not null
);

create table "public"."line_agent_activity" (
  "id" uuid default gen_random_uuid() not null,
  "agent_slug" text,
  "occurred_at" timestamp with time zone default now() not null,
  "summary" text not null,
  "status" text not null
);

create table "public"."line_agents" (
  "slug" text not null,
  "name" text not null,
  "enabled" boolean default false not null,
  "settings" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."line_conversation_locks" (
  "line_user_id" text not null,
  "owner_agent_slug" text not null,
  "context" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "expires_at" timestamp with time zone not null
);

create table "public"."line_subscribers" (
  "id" uuid default gen_random_uuid() not null,
  "line_user_id" text not null,
  "channel" text default 'primary'::text not null,
  "display_name" text,
  "picture_url" text,
  "tags" text[] default '{}'::text[] not null,
  "note" text,
  "first_seen_at" timestamp with time zone default now() not null,
  "last_seen_at" timestamp with time zone default now() not null
);

create table "public"."line_support_conversations" (
  "id" uuid default gen_random_uuid() not null,
  "line_user_id" text not null,
  "role" text not null,
  "text" text not null,
  "occurred_at" timestamp with time zone default now() not null
);

create table "public"."meeting_turns" (
  "id" uuid default gen_random_uuid() not null,
  "meeting_id" uuid not null,
  "turn_index" integer default 0 not null,
  "role" text not null,
  "agent_slug" text,
  "speaker" text,
  "content" text not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."meetings" (
  "id" uuid default gen_random_uuid() not null,
  "title" text,
  "started_at" timestamp with time zone default now() not null,
  "ended_at" timestamp with time zone,
  "duration_seconds" integer,
  "transcript" text,
  "summary" text,
  "recording_path" text,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."metric_snapshots" (
  "id" bigint default nextval('metric_snapshots_id_seq'::regclass) not null,
  "metric_id" text not null,
  "value" numeric not null,
  "captured_at" timestamp with time zone default now() not null,
  "captured_on" date generated always as (((captured_at AT TIME ZONE 'UTC'::text))::date) stored,
  "source" text,
  "meta" jsonb default '{}'::jsonb not null
);

create table "public"."partners" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "email" text,
  "phone" text,
  "website" text,
  "description" text,
  "logo_url" text,
  "status" text default 'active'::text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."pending_invites" (
  "id" uuid default gen_random_uuid() not null,
  "line_user_id" text not null,
  "contact_id" uuid,
  "to_email" text not null,
  "subject" text not null,
  "body" text not null,
  "slot1" text not null,
  "slot2" text not null,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "resolved_at" timestamp with time zone,
  "slot1_start" timestamp with time zone,
  "slot1_end" timestamp with time zone,
  "slot2_start" timestamp with time zone,
  "slot2_end" timestamp with time zone,
  "chosen_slot" text,
  "calendar_event_id" text,
  "location" text
);

create table "public"."profiles" (
  "id" uuid not null,
  "email" text,
  "full_name" text,
  "avatar_url" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."teachify_orders" (
  "id" uuid default gen_random_uuid() not null,
  "order_id" text not null,
  "trade_no" text,
  "amount" numeric,
  "currency" text default 'TWD'::text not null,
  "user_name" text,
  "user_email" text,
  "item_names" text[] default '{}'::text[] not null,
  "coupon_code" text,
  "is_refund" boolean default false not null,
  "paid_at" timestamp with time zone,
  "source" text default 'webhook'::text not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."user_roles" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "role" user_role default 'user'::user_role not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."user_subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "partner_id" uuid,
  "email" text not null,
  "important_moment" text not null,
  "personalization_data" jsonb,
  "email_verified" boolean default false,
  "status" text default 'active'::text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "full_name" text
);

create table "public"."visit_offers" (
  "id" uuid default gen_random_uuid() not null,
  "line_user_id" text not null,
  "contact_id" uuid,
  "status" text default 'pending'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "resolved_at" timestamp with time zone
);

-- Sequence ownership
alter sequence "public"."metric_snapshots_id_seq" owned by "public"."metric_snapshots"."id";

-- Primary keys, unique constraints, checks, then foreign keys
alter table "public"."agent_artifacts" add constraint "agent_artifacts_pkey" PRIMARY KEY (id);
alter table "public"."agent_goals" add constraint "agent_goals_pkey" PRIMARY KEY (id);
alter table "public"."agent_live_task" add constraint "agent_live_task_pkey" PRIMARY KEY (agent_slug);
alter table "public"."agent_memory" add constraint "agent_memory_level_check" CHECK (level >= 1 AND level <= 4);
alter table "public"."agent_memory" add constraint "agent_memory_pkey" PRIMARY KEY (id);
alter table "public"."agent_run_steps" add constraint "agent_run_steps_pkey" PRIMARY KEY (id);
alter table "public"."agent_runs" add constraint "agent_runs_pkey" PRIMARY KEY (id);
alter table "public"."agent_tasks" add constraint "agent_tasks_pkey" PRIMARY KEY (id);
alter table "public"."ai_usage_logs" add constraint "ai_usage_logs_pkey" PRIMARY KEY (id);
alter table "public"."broadcast_logs" add constraint "broadcast_logs_pkey" PRIMARY KEY (id);
alter table "public"."checklist_status" add constraint "checklist_status_pkey" PRIMARY KEY (item_id);
alter table "public"."contact_profiles" add constraint "contact_profiles_pkey" PRIMARY KEY (id);
alter table "public"."contacts" add constraint "contacts_pkey" PRIMARY KEY (id);
alter table "public"."kb_chunks" add constraint "kb_chunks_level_check" CHECK (level >= 1 AND level <= 4);
alter table "public"."kb_chunks" add constraint "kb_chunks_pkey" PRIMARY KEY (id);
alter table "public"."kb_citations" add constraint "kb_citations_pkey" PRIMARY KEY (id);
alter table "public"."kb_sources" add constraint "kb_sources_checksum_key" UNIQUE (checksum);
alter table "public"."kb_sources" add constraint "kb_sources_pkey" PRIMARY KEY (id);
alter table "public"."kb_sources" add constraint "kb_sources_type_check" CHECK (source_type = ANY (ARRAY['pdf'::text, 'url'::text, 'site'::text]));
alter table "public"."knowledge_access" add constraint "knowledge_access_max_level_check" CHECK (max_level >= 1 AND max_level <= 4);
alter table "public"."knowledge_access" add constraint "knowledge_access_pkey" PRIMARY KEY (agent_slug);
alter table "public"."knowledge_base" add constraint "knowledge_base_kind_check" CHECK (kind = ANY (ARRAY['faq'::text, 'sop'::text, 'fact'::text, 'table'::text, 'doc'::text]));
alter table "public"."knowledge_base" add constraint "knowledge_base_level_check" CHECK (level >= 1 AND level <= 4);
alter table "public"."knowledge_base" add constraint "knowledge_base_pkey" PRIMARY KEY (id);
alter table "public"."knowledge_base" add constraint "knowledge_base_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]));
alter table "public"."line_agent_activity" add constraint "line_agent_activity_pkey" PRIMARY KEY (id);
alter table "public"."line_agent_activity" add constraint "line_agent_activity_status_check" CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text]));
alter table "public"."line_agents" add constraint "line_agents_pkey" PRIMARY KEY (slug);
alter table "public"."line_conversation_locks" add constraint "line_conversation_locks_pkey" PRIMARY KEY (line_user_id);
alter table "public"."line_subscribers" add constraint "line_subscribers_channel_check" CHECK (channel = ANY (ARRAY['primary'::text, 'support'::text]));
alter table "public"."line_subscribers" add constraint "line_subscribers_line_user_id_key" UNIQUE (line_user_id);
alter table "public"."line_subscribers" add constraint "line_subscribers_pkey" PRIMARY KEY (id);
alter table "public"."line_support_conversations" add constraint "line_support_conversations_pkey" PRIMARY KEY (id);
alter table "public"."line_support_conversations" add constraint "line_support_conversations_role_check" CHECK (role = ANY (ARRAY['customer'::text, 'bot'::text]));
alter table "public"."meeting_turns" add constraint "meeting_turns_pkey" PRIMARY KEY (id);
alter table "public"."meetings" add constraint "meetings_pkey" PRIMARY KEY (id);
alter table "public"."metric_snapshots" add constraint "metric_snapshots_pkey" PRIMARY KEY (id);
alter table "public"."partners" add constraint "partners_pkey" PRIMARY KEY (id);
alter table "public"."partners" add constraint "partners_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]));
alter table "public"."pending_invites" add constraint "pending_invites_pkey" PRIMARY KEY (id);
alter table "public"."pending_invites" add constraint "pending_invites_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'awaiting_approval'::text, 'confirmed'::text, 'cancelled'::text, 'sent'::text, 'failed'::text]));
alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table "public"."teachify_orders" add constraint "teachify_orders_order_id_key" UNIQUE (order_id);
alter table "public"."teachify_orders" add constraint "teachify_orders_pkey" PRIMARY KEY (id);
alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY (id);
alter table "public"."user_roles" add constraint "user_roles_user_id_role_key" UNIQUE (user_id, role);
alter table "public"."user_subscriptions" add constraint "user_subscriptions_pkey" PRIMARY KEY (id);
alter table "public"."user_subscriptions" add constraint "user_subscriptions_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'cancelled'::text]));
alter table "public"."visit_offers" add constraint "visit_offers_pkey" PRIMARY KEY (id);
alter table "public"."visit_offers" add constraint "visit_offers_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]));
alter table "public"."agent_artifacts" add constraint "agent_artifacts_run_id_fkey" FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
alter table "public"."agent_memory" add constraint "agent_memory_source_run_id_fkey" FOREIGN KEY (source_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
alter table "public"."agent_run_steps" add constraint "agent_run_steps_run_id_fkey" FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE;
alter table "public"."agent_runs" add constraint "agent_runs_parent_run_id_fkey" FOREIGN KEY (parent_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
alter table "public"."agent_tasks" add constraint "agent_tasks_handled_run_id_fkey" FOREIGN KEY (handled_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
alter table "public"."agent_tasks" add constraint "agent_tasks_source_run_id_fkey" FOREIGN KEY (source_run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
alter table "public"."ai_usage_logs" add constraint "ai_usage_logs_run_id_fkey" FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL;
alter table "public"."contact_profiles" add constraint "contact_profiles_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
alter table "public"."line_agent_activity" add constraint "line_agent_activity_agent_slug_fkey" FOREIGN KEY (agent_slug) REFERENCES line_agents(slug) ON DELETE CASCADE;
alter table "public"."meeting_turns" add constraint "meeting_turns_meeting_id_fkey" FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE;
alter table "public"."pending_invites" add constraint "pending_invites_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES contacts(id);
alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "public"."user_subscriptions" add constraint "user_subscriptions_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
alter table "public"."user_subscriptions" add constraint "user_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "public"."visit_offers" add constraint "visit_offers_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Non-constraint indexes
create INDEX agent_artifacts_agent_idx ON public.agent_artifacts USING btree (agent_slug, created_at DESC);
create INDEX agent_artifacts_run_idx ON public.agent_artifacts USING btree (run_id);
create INDEX agent_goals_agent_idx ON public.agent_goals USING btree (agent_slug);
create INDEX agent_memory_level_idx ON public.agent_memory USING btree (level);
create INDEX agent_memory_lookup_idx ON public.agent_memory USING btree (scope, agent_slug, kind, created_at DESC);
create INDEX agent_run_steps_run_idx ON public.agent_run_steps USING btree (run_id, seq);
create INDEX agent_runs_agent_started_idx ON public.agent_runs USING btree (agent_slug, started_at DESC);
create INDEX agent_runs_retry_idx ON public.agent_runs USING btree (next_retry_at) WHERE ((status = 'failed'::text) AND (next_retry_at IS NOT NULL));
create INDEX agent_runs_status_idx ON public.agent_runs USING btree (status);
create UNIQUE INDEX agent_runs_trigger_ref_key ON public.agent_runs USING btree (agent_slug, trigger_ref) WHERE (trigger_ref IS NOT NULL);
create INDEX agent_tasks_queue_idx ON public.agent_tasks USING btree (to_agent, state, created_at);
create INDEX ai_usage_logs_created_at_idx ON public.ai_usage_logs USING btree (created_at DESC);
create INDEX ai_usage_logs_run_idx ON public.ai_usage_logs USING btree (run_id);
create INDEX contact_profiles_contact_idx ON public.contact_profiles USING btree (contact_id, created_at DESC);
create INDEX contact_profiles_created_idx ON public.contact_profiles USING btree (created_at DESC);
create UNIQUE INDEX kb_chunks_doc_chunk_key ON public.kb_chunks USING btree (doc_id, chunk_index);
create INDEX kb_chunks_level_idx ON public.kb_chunks USING btree (level);
create INDEX kb_citations_agent_idx ON public.kb_citations USING btree (agent_slug, used_at DESC);
create INDEX kb_citations_doc_idx ON public.kb_citations USING btree (doc_id, used_at DESC);
create INDEX kb_sources_created_idx ON public.kb_sources USING btree (created_at DESC);
create INDEX kb_sources_type_idx ON public.kb_sources USING btree (source_type, last_checked_at);
create INDEX knowledge_base_source_idx ON public.knowledge_base USING btree (source_doc_id);
create INDEX knowledge_base_status_idx ON public.knowledge_base USING btree (status, level);
create INDEX line_agent_activity_agent_slug_idx ON public.line_agent_activity USING btree (agent_slug, occurred_at DESC);
create INDEX line_subscribers_tags_idx ON public.line_subscribers USING gin (tags);
create INDEX line_support_conversations_user_idx ON public.line_support_conversations USING btree (line_user_id, occurred_at);
create INDEX meeting_turns_meeting_idx ON public.meeting_turns USING btree (meeting_id, turn_index);
create UNIQUE INDEX metric_snapshots_daily_key ON public.metric_snapshots USING btree (metric_id, captured_on);
create INDEX metric_snapshots_metric_idx ON public.metric_snapshots USING btree (metric_id, captured_at DESC);
create INDEX teachify_orders_paid_at_idx ON public.teachify_orders USING btree (paid_at DESC);

-- Functions
CREATE OR REPLACE FUNCTION public.add_run_cost(p_run_id uuid, p_tokens integer, p_cost numeric)
 RETURNS void
 LANGUAGE sql
AS $function$
  update public.agent_runs
     set cost_usd     = cost_usd + coalesce(p_cost, 0),
         total_tokens = total_tokens + coalesce(p_tokens, 0)
   where id = p_run_id;
$function$;
CREATE OR REPLACE FUNCTION public.claim_agent_tasks(p_agent text, p_limit integer DEFAULT 5)
 RETURNS SETOF agent_tasks
 LANGUAGE plpgsql
AS $function$
begin
  return query
  update public.agent_tasks t
     set state      = 'claimed',
         attempts   = t.attempts + 1,
         claimed_at = now(),
         updated_at = now()
   where t.id in (
     select id
       from public.agent_tasks
      where to_agent = p_agent
        and state = 'queued'
        and (due_at is null or due_at <= now())
      order by created_at
      limit p_limit
      for update skip locked
   )
  returning t.*;
end
$function$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = $1
      AND role = 'admin'
  );
$function$;
CREATE OR REPLACE FUNCTION public.match_kb_chunks(query_embedding vector, max_level integer, match_count integer DEFAULT 6)
 RETURNS TABLE(id uuid, doc_id text, title text, content text, level smallint, source_page integer, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    c.id,
    c.doc_id,
    c.title,
    c.content,
    c.level,
    c.source_page,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.kb_chunks c
  where c.embedding is not null
    and c.level <= max_level
  order by c.embedding operator(extensions.<=>) query_embedding
  limit match_count;
$function$;
CREATE OR REPLACE FUNCTION public.requeue_stale_agent_tasks(p_minutes integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
  n integer;
begin
  update public.agent_tasks
     set state = 'queued', updated_at = now()
   where state = 'claimed'
     and claimed_at < now() - make_interval(mins => p_minutes);
  get diagnostics n = row_count;
  return n;
end
$function$;

-- Custom triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row-level security
alter table "public"."agent_artifacts" enable row level security;
alter table "public"."agent_goals" enable row level security;
alter table "public"."agent_live_task" enable row level security;
alter table "public"."agent_memory" enable row level security;
alter table "public"."agent_run_steps" enable row level security;
alter table "public"."agent_runs" enable row level security;
alter table "public"."agent_tasks" enable row level security;
alter table "public"."ai_usage_logs" enable row level security;
alter table "public"."broadcast_logs" enable row level security;
alter table "public"."checklist_status" enable row level security;
alter table "public"."contact_profiles" enable row level security;
alter table "public"."contacts" enable row level security;
alter table "public"."kb_chunks" enable row level security;
alter table "public"."kb_citations" enable row level security;
alter table "public"."kb_sources" enable row level security;
alter table "public"."knowledge_access" enable row level security;
alter table "public"."knowledge_base" enable row level security;
alter table "public"."line_agent_activity" enable row level security;
alter table "public"."line_agents" enable row level security;
alter table "public"."line_conversation_locks" enable row level security;
alter table "public"."line_subscribers" enable row level security;
alter table "public"."line_support_conversations" enable row level security;
alter table "public"."meeting_turns" enable row level security;
alter table "public"."meetings" enable row level security;
alter table "public"."metric_snapshots" enable row level security;
alter table "public"."partners" enable row level security;
alter table "public"."pending_invites" enable row level security;
alter table "public"."profiles" enable row level security;
alter table "public"."teachify_orders" enable row level security;
alter table "public"."user_roles" enable row level security;
alter table "public"."user_subscriptions" enable row level security;
alter table "public"."visit_offers" enable row level security;

create policy "agent_artifacts_insert" on "public"."agent_artifacts" as permissive for insert to "public" with check (true);
create policy "agent_artifacts_select" on "public"."agent_artifacts" as permissive for select to "public" using (true);
create policy "agent_artifacts_update" on "public"."agent_artifacts" as permissive for update to "public" using (true) with check (true);
create policy "agent_goals_delete" on "public"."agent_goals" as permissive for delete to "public" using (true);
create policy "agent_goals_insert" on "public"."agent_goals" as permissive for insert to "public" with check (true);
create policy "agent_goals_select" on "public"."agent_goals" as permissive for select to "public" using (true);
create policy "agent_goals_update" on "public"."agent_goals" as permissive for update to "public" using (true) with check (true);
create policy "agent_live_task_insert" on "public"."agent_live_task" as permissive for insert to "public" with check (true);
create policy "agent_live_task_select" on "public"."agent_live_task" as permissive for select to "public" using (true);
create policy "agent_live_task_update" on "public"."agent_live_task" as permissive for update to "public" using (true) with check (true);
create policy "agent_memory_insert" on "public"."agent_memory" as permissive for insert to "public" with check (true);
create policy "agent_memory_select" on "public"."agent_memory" as permissive for select to "public" using (true);
create policy "agent_memory_update" on "public"."agent_memory" as permissive for update to "public" using (true) with check (true);
create policy "agent_run_steps_insert" on "public"."agent_run_steps" as permissive for insert to "public" with check (true);
create policy "agent_run_steps_select" on "public"."agent_run_steps" as permissive for select to "public" using (true);
create policy "agent_run_steps_update" on "public"."agent_run_steps" as permissive for update to "public" using (true) with check (true);
create policy "agent_runs_insert" on "public"."agent_runs" as permissive for insert to "public" with check (true);
create policy "agent_runs_select" on "public"."agent_runs" as permissive for select to "public" using (true);
create policy "agent_runs_update" on "public"."agent_runs" as permissive for update to "public" using (true) with check (true);
create policy "agent_tasks_insert" on "public"."agent_tasks" as permissive for insert to "public" with check (true);
create policy "agent_tasks_select" on "public"."agent_tasks" as permissive for select to "public" using (true);
create policy "agent_tasks_update" on "public"."agent_tasks" as permissive for update to "public" using (true) with check (true);
create policy "ai_usage_logs_insert" on "public"."ai_usage_logs" as permissive for insert to "public" with check (true);
create policy "ai_usage_logs_select" on "public"."ai_usage_logs" as permissive for select to "public" using (true);
create policy "broadcast_logs_insert" on "public"."broadcast_logs" as permissive for insert to "public" with check (true);
create policy "broadcast_logs_select" on "public"."broadcast_logs" as permissive for select to "public" using (true);
create policy "checklist_status_insert" on "public"."checklist_status" as permissive for insert to "public" with check (true);
create policy "checklist_status_select" on "public"."checklist_status" as permissive for select to "public" using (true);
create policy "checklist_status_update" on "public"."checklist_status" as permissive for update to "public" using (true) with check (true);
create policy "contact_profiles_insert" on "public"."contact_profiles" as permissive for insert to "public" with check (true);
create policy "contact_profiles_select" on "public"."contact_profiles" as permissive for select to "public" using (true);
create policy "contact_profiles_update" on "public"."contact_profiles" as permissive for update to "public" using (true) with check (true);
create policy "contacts_insert" on "public"."contacts" as permissive for insert to "public" with check (true);
create policy "contacts_select" on "public"."contacts" as permissive for select to "public" using (true);
create policy "contacts_update" on "public"."contacts" as permissive for update to "public" using (true) with check (true);
create policy "kb_chunks_insert" on "public"."kb_chunks" as permissive for insert to "public" with check (true);
create policy "kb_chunks_select" on "public"."kb_chunks" as permissive for select to "public" using (true);
create policy "kb_chunks_update" on "public"."kb_chunks" as permissive for update to "public" using (true) with check (true);
create policy "kb_citations_delete" on "public"."kb_citations" as permissive for delete to "public" using (true);
create policy "kb_citations_insert" on "public"."kb_citations" as permissive for insert to "public" with check (true);
create policy "kb_citations_select" on "public"."kb_citations" as permissive for select to "public" using (true);
create policy "kb_citations_update" on "public"."kb_citations" as permissive for update to "public" using (true) with check (true);
create policy "kb_sources_delete" on "public"."kb_sources" as permissive for delete to "public" using (true);
create policy "kb_sources_insert" on "public"."kb_sources" as permissive for insert to "public" with check (true);
create policy "kb_sources_select" on "public"."kb_sources" as permissive for select to "public" using (true);
create policy "kb_sources_update" on "public"."kb_sources" as permissive for update to "public" using (true) with check (true);
create policy "knowledge_access_insert" on "public"."knowledge_access" as permissive for insert to "public" with check (true);
create policy "knowledge_access_select" on "public"."knowledge_access" as permissive for select to "public" using (true);
create policy "knowledge_access_update" on "public"."knowledge_access" as permissive for update to "public" using (true) with check (true);
create policy "knowledge_base_delete" on "public"."knowledge_base" as permissive for delete to "public" using (true);
create policy "knowledge_base_insert" on "public"."knowledge_base" as permissive for insert to "public" with check (true);
create policy "knowledge_base_select" on "public"."knowledge_base" as permissive for select to "public" using (true);
create policy "knowledge_base_update" on "public"."knowledge_base" as permissive for update to "public" using (true) with check (true);
create policy "line_agent_activity_insert" on "public"."line_agent_activity" as permissive for insert to "public" with check (true);
create policy "line_agent_activity_select" on "public"."line_agent_activity" as permissive for select to "public" using (true);
create policy "line_agents_select" on "public"."line_agents" as permissive for select to "public" using (true);
create policy "line_agents_update" on "public"."line_agents" as permissive for update to "public" using (true) with check (true);
create policy "line_conversation_locks_delete" on "public"."line_conversation_locks" as permissive for delete to "public" using (true);
create policy "line_conversation_locks_insert" on "public"."line_conversation_locks" as permissive for insert to "public" with check (true);
create policy "line_conversation_locks_select" on "public"."line_conversation_locks" as permissive for select to "public" using (true);
create policy "line_conversation_locks_update" on "public"."line_conversation_locks" as permissive for update to "public" using (true) with check (true);
create policy "line_subscribers_insert" on "public"."line_subscribers" as permissive for insert to "public" with check (true);
create policy "line_subscribers_select" on "public"."line_subscribers" as permissive for select to "public" using (true);
create policy "line_subscribers_update" on "public"."line_subscribers" as permissive for update to "public" using (true) with check (true);
create policy "line_support_conversations_insert" on "public"."line_support_conversations" as permissive for insert to "public" with check (true);
create policy "line_support_conversations_select" on "public"."line_support_conversations" as permissive for select to "public" using (true);
create policy "meeting_turns_all" on "public"."meeting_turns" as permissive for all to "public" using (true) with check (true);
create policy "meetings_all" on "public"."meetings" as permissive for all to "public" using (true) with check (true);
create policy "metric_snapshots_insert" on "public"."metric_snapshots" as permissive for insert to "public" with check (true);
create policy "metric_snapshots_select" on "public"."metric_snapshots" as permissive for select to "public" using (true);
create policy "metric_snapshots_update" on "public"."metric_snapshots" as permissive for update to "public" using (true) with check (true);
create policy "Admins can manage all partners" on "public"."partners" as permissive for all to "public" using (is_admin(auth.uid()));
create policy "pending_invites_insert" on "public"."pending_invites" as permissive for insert to "public" with check (true);
create policy "pending_invites_select" on "public"."pending_invites" as permissive for select to "public" using (true);
create policy "pending_invites_update" on "public"."pending_invites" as permissive for update to "public" using (true) with check (true);
create policy "Admins can view all profiles" on "public"."profiles" as permissive for all to "public" using (is_admin(auth.uid()));
create policy "Users can update own profile" on "public"."profiles" as permissive for update to "public" using ((auth.uid() = id));
create policy "Users can view own profile" on "public"."profiles" as permissive for select to "public" using ((auth.uid() = id));
create policy "teachify_orders_insert" on "public"."teachify_orders" as permissive for insert to "public" with check (true);
create policy "teachify_orders_select" on "public"."teachify_orders" as permissive for select to "public" using (true);
create policy "Admins can manage all roles" on "public"."user_roles" as permissive for all to "public" using (is_admin(auth.uid()));
create policy "Admins can manage all subscriptions" on "public"."user_subscriptions" as permissive for all to "public" using (is_admin(auth.uid()));
create policy "Allow admin to view all subscriptions" on "public"."user_subscriptions" as permissive for select to "public" using ((is_admin(auth.uid()) OR (auth.uid() IS NULL)));
create policy "Allow anonymous subscription creation" on "public"."user_subscriptions" as permissive for insert to "public" with check (true);
create policy "Allow users to insert subscriptions" on "public"."user_subscriptions" as permissive for insert to "public" with check (((user_id IS NULL) OR (auth.uid() = user_id)));
create policy "Users can create own subscriptions" on "public"."user_subscriptions" as permissive for insert to "public" with check ((auth.uid() = user_id));
create policy "Users can update their own subscriptions" on "public"."user_subscriptions" as permissive for update to "public" using ((auth.uid() = user_id));
create policy "Users can view own subscriptions" on "public"."user_subscriptions" as permissive for select to "public" using ((auth.uid() = user_id));
create policy "Users can view their own subscriptions" on "public"."user_subscriptions" as permissive for select to "public" using ((auth.uid() = user_id));
create policy "visit_offers_insert" on "public"."visit_offers" as permissive for insert to "public" with check (true);
create policy "visit_offers_select" on "public"."visit_offers" as permissive for select to "public" using (true);
create policy "visit_offers_update" on "public"."visit_offers" as permissive for update to "public" using (true) with check (true);
create policy "meeting_rec_insert" on "storage"."objects" as permissive for insert to "anon", "authenticated" with check ((bucket_id = 'meeting-recordings'::text));
create policy "meeting_rec_select" on "storage"."objects" as permissive for select to "anon", "authenticated" using ((bucket_id = 'meeting-recordings'::text));

-- Table grants, consolidated from the live ACL
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_artifacts" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_artifacts" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_artifacts" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_artifacts" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_goals" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_goals" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_goals" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_goals" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_live_task" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_live_task" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_live_task" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_live_task" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_memory" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_memory" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_memory" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_memory" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_run_steps" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_run_steps" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_run_steps" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_run_steps" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_runs" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_runs" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_runs" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_runs" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_tasks" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_tasks" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_tasks" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."agent_tasks" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."ai_usage_logs" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."ai_usage_logs" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."ai_usage_logs" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."ai_usage_logs" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."broadcast_logs" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."broadcast_logs" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."broadcast_logs" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."broadcast_logs" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."checklist_status" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."checklist_status" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."checklist_status" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."checklist_status" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."contact_profiles" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."contact_profiles" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."contact_profiles" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."contact_profiles" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."contacts" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."contacts" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."contacts" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."contacts" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_chunks" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_chunks" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_chunks" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_chunks" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_citations" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_citations" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_citations" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_citations" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_sources" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_sources" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_sources" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."kb_sources" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_access" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_access" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_access" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_access" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_base" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_base" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_base" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."knowledge_base" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agent_activity" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agent_activity" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agent_activity" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agent_activity" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agents" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agents" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agents" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_agents" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_conversation_locks" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_conversation_locks" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_conversation_locks" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_conversation_locks" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_subscribers" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_subscribers" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_subscribers" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_subscribers" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_support_conversations" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_support_conversations" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_support_conversations" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."line_support_conversations" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."meeting_turns" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."meeting_turns" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."meeting_turns" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."meeting_turns" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."meetings" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."meetings" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."meetings" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."meetings" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."metric_snapshots" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."metric_snapshots" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."metric_snapshots" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."metric_snapshots" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."partners" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."partners" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."partners" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."partners" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."pending_invites" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."pending_invites" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."pending_invites" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."pending_invites" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."profiles" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."profiles" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."profiles" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."profiles" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."teachify_orders" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."teachify_orders" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."teachify_orders" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."teachify_orders" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_roles" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_roles" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_roles" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_roles" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_subscriptions" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_subscriptions" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_subscriptions" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."user_subscriptions" to "service_role";
grant delete, insert, references, select, trigger, truncate, update on table "public"."visit_offers" to "anon";
grant delete, insert, references, select, trigger, truncate, update on table "public"."visit_offers" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."visit_offers" to "postgres" with grant option;
grant delete, insert, references, select, trigger, truncate, update on table "public"."visit_offers" to "service_role";
grant usage, select on sequence "public"."metric_snapshots_id_seq" to "anon";
grant usage, select on sequence "public"."metric_snapshots_id_seq" to "authenticated";
grant usage, select on sequence "public"."metric_snapshots_id_seq" to "service_role";

-- Storage configuration (metadata only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('meeting-recordings', 'meeting-recordings', false, NULL, NULL) on conflict (id) do update set name = excluded.name, public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
