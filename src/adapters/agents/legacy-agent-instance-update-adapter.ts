import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { AgentInstanceUpdatePort } from "@/modules/agents/agent-instance-update-ports";

export function createLegacyAgentInstanceUpdateAdapter(): AgentInstanceUpdatePort {
  const supabase = getSupabase();
  return {
    async updateBySlug(slug, update) {
      const { data, error } = await supabase
        .from("line_agents")
        .update(update)
        .eq("slug", slug)
        .select()
        .single();
      return { data: data ?? null, errorMessage: error?.message ?? null };
    },
    async recordActivity(activity) {
      await supabase.from("line_agent_activity").insert(activity);
    },
  };
}
