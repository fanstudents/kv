import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { AgentStatusReadPort } from "@/modules/agents/status-read-ports";

export function createLegacyAgentStatusReadAdapter(): AgentStatusReadPort {
  return {
    async list() {
      const { data, error } = await getSupabase()
        .from("line_agents")
        .select("slug,enabled");
      return { data, error };
    },
  };
}
