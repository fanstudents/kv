-- Agent 執行核心資料模型（最小七張表）
--
-- 現況的問題：一次任務跑完會散成「activity 一列文字 + live_task 一列暫存 + ai_usage 幾列」，
-- 彼此沒有關聯，所以回答不了「這份產出是哪一次執行、讀了什麼、花多少錢做出來的」。
-- 這組表把 run_id 當成那根軸：
--   agent_runs       一次執行＝一列（誰、被什麼觸發、成功失敗、花多少）
--   agent_run_steps  執行中走過的每個流程節點（node_id 對應 agent-briefings 的 flow 節點 id）
--   agent_artifacts  這次執行產出的東西（報表、信件、貼文…），可追溯回 run
--   agent_memory     Agent 的個人／團隊記憶，沿用知識庫的 L1-L4 分級與 TTL
--   metric_snapshots 目標指標的每日快照，達成率才有趨勢與歸因
--   agent_tasks      Agent 之間真正的委派佇列（流程圖上的「協同」落地）
--   kb_chunks        知識庫切塊 + 向量，讓檢索取代「整包塞進 prompt」
--
-- 全部 additive，不動既有的 line_agents / line_agent_activity / knowledge_base。
-- 已於 Supabase 專案 ytrolpaeuckdwgvifdhl 套用（2026-07-25）；此檔留存以利重建。

-- ── 1. 一次執行 ──────────────────────────────────────────────
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_slug text not null,
  -- 什麼觸發的：schedule（排程）、webhook、manual（人在後台按）、agent（別的 Agent 委派）
  trigger text not null default 'manual',
  -- 觸發來源的識別（cron 名稱、webhook event id、委派的 task id…），去重與追查用
  trigger_ref text,
  -- 這次執行是為了哪個目標（可空）
  goal_id text,
  status text not null default 'running',      -- running | success | failed | waiting | cancelled
  error_kind text,                              -- external | data | model | timeout | unknown
  error_detail text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- 這次執行累積的 AI 成本（美元）與 token
  cost_usd numeric(10, 6) not null default 0,
  total_tokens integer not null default 0,
  summary text,
  meta jsonb not null default '{}'::jsonb
);
create index if not exists agent_runs_agent_started_idx on public.agent_runs (agent_slug, started_at desc);
create index if not exists agent_runs_status_idx on public.agent_runs (status);
-- 同一個觸發來源只允許一次執行：webhook 重送不會變成重複推播
create unique index if not exists agent_runs_trigger_ref_key
  on public.agent_runs (agent_slug, trigger_ref) where trigger_ref is not null;

-- ── 2. 執行中的每個節點 ──────────────────────────────────────
create table if not exists public.agent_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs (id) on delete cascade,
  -- 對應 agent-briefings.ts 裡 flow 節點的 id，流程圖畫的就是這裡跑的
  node_id text not null,
  seq integer not null default 0,
  status text not null default 'running',      -- running | done | skipped | failed | waiting
  input_summary text,
  output_summary text,
  tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  duration_ms integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists agent_run_steps_run_idx on public.agent_run_steps (run_id, seq);

-- ── 3. 產出物 ───────────────────────────────────────────────
create table if not exists public.agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.agent_runs (id) on delete set null,
  agent_slug text not null,
  kind text not null,                           -- report | chart | doc | mail | calendar | post | message | alert
  title text not null,
  -- 內容本體（文字／HTML／JSON 皆可）或外部連結，二擇一
  content text,
  uri text,
  version integer not null default 1,
  -- 對外送出的產出需要人核可：誰、什麼時候
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
create index if not exists agent_artifacts_agent_idx on public.agent_artifacts (agent_slug, created_at desc);
create index if not exists agent_artifacts_run_idx on public.agent_artifacts (run_id);

-- ── 4. 記憶（個人／團隊）─────────────────────────────────────
create table if not exists public.agent_memory (
  id uuid primary key default gen_random_uuid(),
  -- 'agent' = 這位 Agent 自己的記憶；'team' = 全隊共用（Team Lead 的晨報結論就屬於這層）
  scope text not null default 'agent',
  agent_slug text,                              -- scope = team 時可為 null
  -- episodic：做過什麼、結果如何；semantic：學到的事實；preference：對象的偏好與習慣
  kind text not null default 'episodic',
  content text not null,
  -- 這條記憶是哪一次執行沉澱下來的
  source_run_id uuid references public.agent_runs (id) on delete set null,
  -- 沿用知識庫的敏感度分級：記憶也要治理，L3 的記憶不該被 L2 的 Agent 讀到
  level smallint not null default 2 check (level between 1 and 4),
  confidence real not null default 0.6,
  -- 記憶要會過期，不然會慢慢中毒
  expires_at timestamptz,
  last_used_at timestamptz,
  use_count integer not null default 0,
  embedding_json jsonb,                         -- 之後接向量檢索時改存 pgvector
  created_at timestamptz not null default now()
);
create index if not exists agent_memory_lookup_idx on public.agent_memory (scope, agent_slug, kind, created_at desc);
create index if not exists agent_memory_level_idx on public.agent_memory (level);

-- ── 5. 指標快照（目標達成率的時間序列）──────────────────────
create table if not exists public.metric_snapshots (
  id bigserial primary key,
  -- 對應 agent-goals.ts 的 GOAL_METRICS.id，例如 gsc-clicks、ads-roas
  metric_id text not null,
  value numeric not null,
  captured_at timestamptz not null default now(),
  -- 以 UTC 日期當「一天」的鍵：同一天同指標只留一筆（重跑會覆蓋而不是長出第二筆）。
  -- 用 generated column 而不是索引運算式，PostgREST 的 upsert 才有實體欄位可以指定衝突鍵。
  captured_on date generated always as (((captured_at at time zone 'UTC'))::date) stored,
  source text,                                  -- gsc | ga4 | meta | manual | demo
  meta jsonb not null default '{}'::jsonb
);
create unique index if not exists metric_snapshots_daily_key
  on public.metric_snapshots (metric_id, captured_on);
create index if not exists metric_snapshots_metric_idx on public.metric_snapshots (metric_id, captured_at desc);

-- ── 6. Agent 之間的委派佇列 ─────────────────────────────────
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  from_agent text,
  to_agent text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  state text not null default 'queued',         -- queued | claimed | done | failed | cancelled
  -- 建立這筆委派的那次執行，與處理它的那次執行
  source_run_id uuid references public.agent_runs (id) on delete set null,
  handled_run_id uuid references public.agent_runs (id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_tasks_queue_idx on public.agent_tasks (to_agent, state, created_at);

-- ── 7. 知識庫切塊（檢索用）──────────────────────────────────
create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id text not null,
  chunk_index integer not null default 0,
  content text not null,
  level smallint not null default 1 check (level between 1 and 4),
  token_estimate integer,
  embedding_json jsonb,                         -- 之後接 pgvector 時改型別
  updated_at timestamptz not null default now()
);
create unique index if not exists kb_chunks_doc_chunk_key on public.kb_chunks (doc_id, chunk_index);
create index if not exists kb_chunks_level_idx on public.kb_chunks (level);

-- ── RLS：跟既有表一致（單一管理者的內部控制台，先全開）──────
do $$
declare t text;
begin
  foreach t in array array[
    'agent_runs', 'agent_run_steps', 'agent_artifacts',
    'agent_memory', 'metric_snapshots', 'agent_tasks', 'kb_chunks'
  ] loop
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
    execute format('grant select, insert, update on public.%I to anon, authenticated', t);
  end loop;
end $$;

grant usage, select on sequence public.metric_snapshots_id_seq to anon, authenticated;
