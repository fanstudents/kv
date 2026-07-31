import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { AgentInstanceReadPort } from "@/modules/agents/agent-instance-read-ports";

export function createLegacyAgentInstanceReadAdapter(): AgentInstanceReadPort {
  return {
    async getBySlug(slug) {
      const { data, error } = await getSupabase().from("line_agents").select("*").eq("slug", slug).single();
      return { data: data ?? null, errorMessage: error?.message ?? null };
    },
  };
}
