import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { ActivityReadPort } from "@/modules/activity/read-ports";

export function createLegacyActivityReadAdapter(): ActivityReadPort {
  return {
    async list(status, limit, agentSlug) {
      const supabase = getSupabase();
      let query = supabase
        .from("line_agent_activity")
        .select("*");
      if (agentSlug) query = query.eq("agent_slug", agentSlug);
      query = query.order("occurred_at", { ascending: false }).limit(limit);
      if (status) query = query.eq("status", status);
      return (await query) as { data: unknown; error: { message: string } | null };
    },
  };
}
