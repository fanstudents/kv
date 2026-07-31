import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { SubscribersUpdatePort } from "@/modules/subscribers/update-ports";

export function createLegacySubscribersUpdateAdapter(): SubscribersUpdatePort {
  return {
    async update(id, fields) {
      const { data, error } = await getSupabase()
        .from("line_subscribers")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      return { data, error };
    },
  };
}
