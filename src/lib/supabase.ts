import "server-only";
import { createClient } from "@supabase/supabase-js";

// No generated Database types yet for this project's line_agents / line_agent_activity
// tables, so we fall back to `any` here rather than fighting the inferred `never` schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient<any>> | null = null;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY environment variables");
  }

  client = createClient<any>(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
