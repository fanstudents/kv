import "server-only";
import { createClient } from "@supabase/supabase-js";

// No generated Database types yet for this project's line_agents / line_agent_activity
// tables, so we fall back to `any` here rather than fighting the inferred `never` schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient<any>> | null = null;

/**
 * 伺服器端的 Supabase 客戶端。
 *
 * 優先使用 service_role key：這支客戶端只在伺服器端執行（檔案頂端有 server-only），
 * 金鑰不會被打包進瀏覽器。用 service_role 的意義是——資料庫那邊就可以把 anon 的權限收掉，
 * 改成預設拒絕；否則只要 anon key 外流一次，L4 知識庫、客戶名單、背景調查全部可讀可寫。
 *
 * 還沒設定 service_role key 時會退回 anon key（維持現況可運作），但會在伺服器 log 提醒。
 */
export function getSupabase() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = createClient<any>(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
