-- Agent 執行核心的補強：成本歸屬、重試／死信、委派佇列的原子 claim
--
-- 20260725_agent_runtime_core.sql 把七張表的骨架立好了，這份補上讓它「真的會動」缺的東西：
--   1. ai_usage_logs.run_id  ── 成本從兩本各自記帳的簿子，變成一本可以歸屬到執行的帳
--   2. add_run_cost()        ── 原子累加，取代應用層的 read-modify-write（併發 step 會漏加）
--   3. agent_runs 的重試欄位 ── 失敗的執行有 retry_count / next_retry_at，才可能被重跑
--   4. claim_agent_tasks()   ── 用 FOR UPDATE SKIP LOCKED 真的把任務「認領」下來，
--                               否則兩個 worker 會同時處理同一筆委派
--
-- 全部 additive，重複執行安全。

-- ── 1. 成本歸屬：每一次 AI 呼叫都知道自己屬於哪一次執行 ──────
alter table public.ai_usage_logs
  add column if not exists run_id uuid references public.agent_runs (id) on delete set null;
create index if not exists ai_usage_logs_run_idx on public.ai_usage_logs (run_id);

-- ── 2. 原子累加執行成本 ──────────────────────────────────────
-- 應用層原本是「先 select 現值、加一加、再 update」，兩個步驟同時回報就會有一筆被蓋掉。
-- 這裡改成資料庫端的單一 update，加多少就是多少。
create or replace function public.add_run_cost(
  p_run_id uuid,
  p_tokens integer,
  p_cost numeric
) returns void
language sql
as $$
  update public.agent_runs
     set cost_usd     = cost_usd + coalesce(p_cost, 0),
         total_tokens = total_tokens + coalesce(p_tokens, 0)
   where id = p_run_id;
$$;
grant execute on function public.add_run_cost(uuid, integer, numeric) to anon, authenticated;

-- ── 3. 重試與死信 ───────────────────────────────────────────
-- 沒有這幾欄，一次 OpenAI 429 就等於那則客戶留言永遠消失：
-- 執行會留下 status='failed'，但沒有任何機制（或人）知道該重跑它。
alter table public.agent_runs
  add column if not exists retry_count integer not null default 0;
alter table public.agent_runs
  add column if not exists next_retry_at timestamptz;
-- 重跑會開一次新的執行，用 parent_run_id 指回原本失敗的那次，才追得出「這是第幾次補救」
alter table public.agent_runs
  add column if not exists parent_run_id uuid references public.agent_runs (id) on delete set null;

-- 待重試佇列：只掃 failed 且已到重試時間的
create index if not exists agent_runs_retry_idx
  on public.agent_runs (next_retry_at)
  where status = 'failed' and next_retry_at is not null;

-- ── 4. 委派佇列：原子認領 ───────────────────────────────────
alter table public.agent_tasks
  add column if not exists attempts integer not null default 0;
alter table public.agent_tasks
  add column if not exists last_error text;
alter table public.agent_tasks
  add column if not exists claimed_at timestamptz;

-- FOR UPDATE SKIP LOCKED：兩個 worker 同時來，各自拿到不同的任務，不會重複處理。
create or replace function public.claim_agent_tasks(
  p_agent text,
  p_limit integer default 5
) returns setof public.agent_tasks
language plpgsql
as $$
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
$$;
grant execute on function public.claim_agent_tasks(text, integer) to anon, authenticated;

-- 認領後卡住的任務（worker 中途掛掉）過 30 分鐘放回佇列，不然會永遠是 claimed。
create or replace function public.requeue_stale_agent_tasks(p_minutes integer default 30)
returns integer
language plpgsql
as $$
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
$$;
grant execute on function public.requeue_stale_agent_tasks(integer) to anon, authenticated;
