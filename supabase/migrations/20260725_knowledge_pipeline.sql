-- 知識庫匯入管線：從「只能手貼一句話」升級成「傳檔案 → 轉條目 → 人審 → 發布」
--
-- 補上原本缺的三件事：
--   1. 更新：knowledge_base 過去只有新增與刪除，沒有 updated_at／版本／狀態，
--      改一個字只能刪掉重建。現在補上 status（草稿／已發布／已封存）與版本欄位。
--   2. 來源：kb_sources 記住每一份上傳的原始檔（檔名、checksum、抽出來的全文），
--      重新切塊、重新萃取都不必再要一次檔案；checksum 唯一，同一份不會被匯入兩次。
--   3. 驗證：kb_citations 記錄「哪一位 Agent、為了回答什麼問題、引用了哪一條」，
--      才答得出「這份知識到底有沒有在幫忙」。
--
-- 已於 Supabase 專案 ytrolpaeuckdwgvifdhl 套用（2026-07-25）；此檔留存以利重建。

-- ── 1. knowledge_base 補欄位 ────────────────────────────────
alter table public.knowledge_base
  add column if not exists status text not null default 'published',
  add column if not exists kind text not null default 'doc',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists version integer not null default 1,
  add column if not exists owner text,
  -- 下次該複檢的日期：知識會過期，沒有複檢日就會被當成永遠正確
  add column if not exists review_at date,
  -- 這一條是從哪一份上傳檔的第幾頁轉出來的（Agent 回答時可以附出處）
  add column if not exists source_doc_id uuid,
  add column if not exists source_page integer,
  add column if not exists meta jsonb not null default '{}'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'knowledge_base_status_check') then
    alter table public.knowledge_base
      add constraint knowledge_base_status_check check (status in ('draft', 'published', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'knowledge_base_kind_check') then
    alter table public.knowledge_base
      add constraint knowledge_base_kind_check check (kind in ('faq', 'sop', 'fact', 'table', 'doc'));
  end if;
end $$;

create index if not exists knowledge_base_status_idx on public.knowledge_base (status, level);
create index if not exists knowledge_base_source_idx on public.knowledge_base (source_doc_id);

-- ── 2. 上傳的原始檔 ─────────────────────────────────────────
create table if not exists public.kb_sources (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  mime_type text,
  byte_size integer,
  -- 內容雜湊：同一份檔案重複上傳直接擋下（或走「新版本」），不會變成兩份互相矛盾的知識
  checksum text not null unique,
  page_count integer,
  char_count integer,
  -- parsed（抽完文字）→ converting（AI 轉條目中）→ reviewing（待人審）→ done／failed
  status text not null default 'parsed',
  error_detail text,
  -- 抽出來的全文：留著才能重新切塊、重新萃取，不必再跟人要一次檔案
  extracted_text text,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
create index if not exists kb_sources_created_idx on public.kb_sources (created_at desc);

-- ── 3. 引用紀錄（驗證知識有沒有真的被用到）──────────────────
create table if not exists public.kb_citations (
  id uuid primary key default gen_random_uuid(),
  doc_id text not null,
  agent_slug text,
  run_id uuid,
  question text,
  used_at timestamptz not null default now()
);
create index if not exists kb_citations_doc_idx on public.kb_citations (doc_id, used_at desc);
create index if not exists kb_citations_agent_idx on public.kb_citations (agent_slug, used_at desc);

-- ── RLS：跟既有表一致 ───────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['kb_sources', 'kb_citations'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policy where polrelid = format('public.%I', t)::regclass and polname = t || '_select') then
      execute format('create policy %I on public.%I for select using (true)', t || '_select', t);
    end if;
    if not exists (select 1 from pg_policy where polrelid = format('public.%I', t)::regclass and polname = t || '_insert') then
      execute format('create policy %I on public.%I for insert with check (true)', t || '_insert', t);
    end if;
    if not exists (select 1 from pg_policy where polrelid = format('public.%I', t)::regclass and polname = t || '_update') then
      execute format('create policy %I on public.%I for update using (true) with check (true)', t || '_update', t);
    end if;
    if not exists (select 1 from pg_policy where polrelid = format('public.%I', t)::regclass and polname = t || '_delete') then
      execute format('create policy %I on public.%I for delete using (true)', t || '_delete', t);
    end if;
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- knowledge_base 原本沒有 delete policy（刪除一直是靜默失敗的原因之一），一併補上
do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'public.knowledge_base'::regclass and polname = 'knowledge_base_delete') then
    create policy knowledge_base_delete on public.knowledge_base for delete using (true);
  end if;
end $$;
grant delete on public.knowledge_base to anon, authenticated;
