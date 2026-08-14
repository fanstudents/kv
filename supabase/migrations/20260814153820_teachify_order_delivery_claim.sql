create table public.teachify_order_deliveries (
  id uuid default gen_random_uuid() not null,
  order_id text not null,
  event_key text not null,
  recipient text not null,
  delivery_status text default 'pending'::text not null,
  attempts integer default 0 not null,
  last_error text,
  claimed_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint teachify_order_deliveries_pkey primary key (id),
  constraint teachify_order_deliveries_order_id_event_key_key unique (order_id, event_key),
  constraint teachify_order_deliveries_order_id_fkey foreign key (order_id)
    references public.teachify_orders(order_id) on delete cascade,
  constraint teachify_order_deliveries_status_check check (
    delivery_status = any (array['pending'::text, 'sending'::text, 'delivered'::text, 'failed'::text])
  )
);

create index teachify_order_deliveries_order_idx
  on public.teachify_order_deliveries using btree (order_id, created_at desc);

create index teachify_order_deliveries_retry_idx
  on public.teachify_order_deliveries using btree (delivery_status, updated_at);

alter table public.teachify_order_deliveries enable row level security;

revoke all on table public.teachify_order_deliveries from anon, authenticated;
grant select, insert, update on table public.teachify_order_deliveries to service_role;

create or replace function public.claim_teachify_order_delivery(
  p_order_id text,
  p_event_key text,
  p_recipient text,
  p_stale_after_seconds integer default 300
)
returns table (
  claim_status text,
  delivery_id uuid,
  delivery_status text
)
language plpgsql
set search_path = public
as $function$
declare
  delivery_row public.teachify_order_deliveries%rowtype;
  stale_after integer := greatest(coalesce(p_stale_after_seconds, 300), 1);
begin
  if nullif(trim(p_order_id), '') is null
     or nullif(trim(p_event_key), '') is null
     or nullif(trim(p_recipient), '') is null then
    raise exception 'order_id, event_key, and recipient are required';
  end if;

  insert into public.teachify_order_deliveries (order_id, event_key, recipient)
  values (p_order_id, p_event_key, p_recipient)
  on conflict (order_id, event_key) do nothing;

  select *
    into delivery_row
    from public.teachify_order_deliveries
   where order_id = p_order_id
     and event_key = p_event_key
   for update;

  if delivery_row.delivery_status = 'delivered' then
    return query select 'delivery_complete'::text, delivery_row.id, delivery_row.delivery_status;
    return;
  end if;

  if delivery_row.delivery_status = 'sending'
     and delivery_row.updated_at > now() - make_interval(secs => stale_after) then
    return query select 'in_progress'::text, delivery_row.id, delivery_row.delivery_status;
    return;
  end if;

  update public.teachify_order_deliveries
     set delivery_status = 'sending',
         recipient = nullif(trim(p_recipient), ''),
         attempts = delivery_row.attempts + 1,
         last_error = null,
         claimed_at = now(),
         updated_at = now()
   where id = delivery_row.id;

  return query select 'claimed'::text, delivery_row.id, 'sending'::text;
end;
$function$;

revoke execute on function public.claim_teachify_order_delivery(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_teachify_order_delivery(text, text, text, integer) to service_role;
