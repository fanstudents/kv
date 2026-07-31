import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { SubscribersReadPort } from "@/modules/subscribers/read-ports";

export function createLegacySubscribersReadAdapter(): SubscribersReadPort {
  return {
    async list() {
      const { data, error } = await getSupabase()
        .from("line_subscribers")
        .select("*")
        .order("last_seen_at", { ascending: false });
      return { data, error };
    },
  };
}
