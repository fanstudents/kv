create table if not exists public.teachify_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  trade_no text,
  amount numeric,
  currency text not null default 'TWD',
  user_name text,
  user_email text,
  item_names text[] not null default '{}',
  coupon_code text,
  is_refund boolean not null default false,
  paid_at timestamptz,
  source text not null default 'webhook',
  created_at timestamptz not null default now()
);

create index if not exists teachify_orders_paid_at_idx on public.teachify_orders (paid_at desc);

alter table public.teachify_orders enable row level security;

create policy teachify_orders_select on public.teachify_orders for select using (true);
create policy teachify_orders_insert on public.teachify_orders for insert with check (true);
