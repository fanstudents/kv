import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { AgentAdminRepository } from "@/modules/agents/admin";

export function createSupabaseAgentAdminRepository(): AgentAdminRepository {
  let supabase: ReturnType<typeof getSupabase> | undefined;
  const client = () => (supabase ??= getSupabase());

  return {
    async getBySlug(slug) {
      const { data, error } = await client().from("line_agents").select("*").eq("slug", slug).single();
      return { data: data ?? null, errorMessage: error?.message ?? null };
    },
    async updateBySlug(slug, update) {
      const { data, error } = await client()
        .from("line_agents")
        .update(update)
        .eq("slug", slug)
        .select()
        .single();
      return { data: data ?? null, errorMessage: error?.message ?? null };
    },
    async listStatuses() {
      const { data, error } = await client().from("line_agents").select("slug,enabled");
      return { data, error };
    },
    async recordActivity(activity) {
      await client().from("line_agent_activity").insert(activity);
    },
  };
}
