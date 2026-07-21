-- 為聯絡人加上標籤陣列（約拜訪 Agent 掃名片後可標記客戶、自動歸類）。
-- 已於 Supabase 專案 ytrolpaeuckdwgvifdhl 套用。
alter table public.contacts add column if not exists tags text[] not null default '{}';
