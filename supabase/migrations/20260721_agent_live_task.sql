-- 劇院模式「真實現正處理」即時狀態（每個 Agent 一列，webhook 寫入、/tv 讀取）。
-- 已於 Supabase 專案 ytrolpaeuckdwgvifdhl 套用；此檔留存以利重建。
create table if not exists public.agent_live_task (
  agent_slug text primary key,
  step integer not null default 0,
  status text not null default 'active',
  caption text,
  image text,                       -- 目前處理中的實際圖片（data URL），只留最新一張
  image_version bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.agent_live_task enable row level security;

do $$ begin
  if not exists (select 1 from pg_policy where polrelid='public.agent_live_task'::regclass and polname='agent_live_task_select') then
    create policy agent_live_task_select on public.agent_live_task for select using (true);
  end if;
  if not exists (select 1 from pg_policy where polrelid='public.agent_live_task'::regclass and polname='agent_live_task_insert') then
    create policy agent_live_task_insert on public.agent_live_task for insert with check (true);
  end if;
  if not exists (select 1 from pg_policy where polrelid='public.agent_live_task'::regclass and polname='agent_live_task_update') then
    create policy agent_live_task_update on public.agent_live_task for update using (true) with check (true);
  end if;
end $$;

grant select, insert, update on public.agent_live_task to anon, authenticated;
