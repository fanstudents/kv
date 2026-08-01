import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Main Supabase 的強型別入口。
 *
 * 所有 Main DB consumer 都使用這個 generated-schema boundary。
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
