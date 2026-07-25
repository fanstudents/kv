-- 收緊資料庫權限：把 anon（匿名）角色的存取權拿掉，改由伺服器端的 service_role 存取。
--
-- 為什麼要做：目前每一張表的 policy 都是 `using (true)` 並且授權給 anon，
-- 也就是說「只要拿到 anon key，就能讀寫全部資料」——包含 L4 高敏感知識庫、
-- 客戶名單（contacts）、拜訪背景調查（contact_profiles）、會議逐字稿。
-- 這支應用的 Supabase 客戶端只在伺服器端執行（src/lib/supabase.ts 有 server-only），
-- 沒有任何 NEXT_PUBLIC_ 變數，瀏覽器拿不到金鑰，所以完全不需要開放 anon。
--
-- ⚠️ 套用順序很重要，順序錯了線上會直接壞掉：
--   1. 先在 Vercel（與本機 .env.local）設好 SUPABASE_SERVICE_ROLE_KEY
--      （Supabase 後台 → Project Settings → API → service_role secret）
--   2. 重新部署，確認畫面正常（伺服器 log 不再出現 [supabase] 使用 anon key 的提醒）
--   3. 才套用這個 migration
--
-- 要回復的話：把下面的 revoke 換成 grant 即可（policy 仍在，只是沒有角色能用）。

do $$
declare t text;
begin
  foreach t in array array[
    'line_agents', 'line_agent_activity', 'checklist_status', 'contacts',
    'pending_invites', 'visit_offers', 'line_subscribers', 'broadcast_logs',
    'ai_usage_logs', 'line_conversation_locks', 'agent_live_task',
    'meetings', 'meeting_turns', 'teachify_orders', 'line_support_conversations',
    'knowledge_base', 'knowledge_access',
    'agent_runs', 'agent_run_steps', 'agent_artifacts', 'agent_memory',
    'metric_snapshots', 'agent_tasks', 'kb_chunks', 'kb_sources', 'kb_citations',
    'contact_profiles', 'agent_goals'
  ] loop
    -- anon 完全不能碰；service_role 本來就繞過 RLS，不需要額外授權
    execute format('revoke all on public.%I from anon', t);
    -- authenticated 先保留（未來若要開放前端直連再逐表評估）
    execute format('revoke all on public.%I from authenticated', t);
  end loop;
end $$;

revoke usage, select on sequence public.metric_snapshots_id_seq from anon, authenticated;
