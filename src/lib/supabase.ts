import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// WP-03 compatibility seam: delete this alias and getSupabase after all existing
// consumers have moved to getMainSupabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyDatabase = any;

let client: SupabaseClient<Database> | null = null;

/**
 * Main Supabase 的強型別入口。
 *
 * 新增或正在整理的 domain 應使用這個入口；既有 consumer 會在 WP-03
 * 依 domain 搬移完成，最後刪除下方的相容入口與 LegacyDatabase。
 */
export function getMainSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（或 SUPABASE_ANON_KEY）environment variables");
  }
  if (!serviceKey) {
    console.warn(
      "[supabase] 目前使用 publishable/anon key，只適合 staging 驗證；" +
        "需要 server-only privileged routes 時請設定 SUPABASE_SERVICE_ROLE_KEY。"
    );
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  return client;
}

/**
 * WP-03 漸進遷移相容入口。
 *
 * 保持既有 consumer 的執行行為與寬鬆型別，避免一次修改整包。每個 domain
 * 搬到 getMainSupabase 後，對應的 any 就會從 production path 消失。
 */
export function getSupabase(): SupabaseClient<LegacyDatabase> {
  return getMainSupabase() as SupabaseClient<LegacyDatabase>;
}
