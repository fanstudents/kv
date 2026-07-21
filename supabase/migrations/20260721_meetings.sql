-- 視訊會議室：老闆用視訊 + 語音對 AI 團隊下指令，Agent 各自回覆、Team Lead 統整，全程錄音存檔。
-- meetings：一場會議一列（逐字稿、Team Lead 結論、錄音檔路徑）。
-- meeting_turns：會議中的每一句（老闆指令 / 各 Agent 回覆 / Team Lead 統整），依 turn_index 排序。
-- 已於 Supabase 專案 ytrolpaeuckdwgvifdhl 套用；此檔留存以利重建。

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  transcript text,                 -- 老闆側完整逐字稿（語音轉文字）
  summary text,                    -- Team Lead 最後一次統整
  recording_path text,             -- Supabase Storage 內的錄音檔路徑（meeting-recordings bucket）
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_turns (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  turn_index integer not null default 0,
  role text not null,              -- 'boss' | 'agent' | 'teamlead'
  agent_slug text,                 -- role='agent' 時的 Agent slug
  speaker text,                    -- 顯示用名稱（老闆 / Agent 姓名）
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists meeting_turns_meeting_idx on public.meeting_turns (meeting_id, turn_index);

alter table public.meetings enable row level security;
alter table public.meeting_turns enable row level security;

do $$ begin
  if not exists (select 1 from pg_policy where polrelid='public.meetings'::regclass and polname='meetings_all') then
    create policy meetings_all on public.meetings for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policy where polrelid='public.meeting_turns'::regclass and polname='meeting_turns_all') then
    create policy meeting_turns_all on public.meeting_turns for all using (true) with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.meetings to anon, authenticated;
grant select, insert, update, delete on public.meeting_turns to anon, authenticated;

-- 錄音檔存放的 Storage bucket（私有；透過後端簽發的 signed URL 才能取用）。
insert into storage.buckets (id, name, public)
values ('meeting-recordings', 'meeting-recordings', false)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='meeting_rec_insert') then
    create policy meeting_rec_insert on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'meeting-recordings');
  end if;
  if not exists (select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='meeting_rec_select') then
    create policy meeting_rec_select on storage.objects for select to anon, authenticated
      using (bucket_id = 'meeting-recordings');
  end if;
end $$;
