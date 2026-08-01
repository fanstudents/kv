import "server-only";
import type { TablesUpdate } from "@/lib/database.types";
import { isDatabaseJson } from "@/lib/database-json";
import { getMainSupabase } from "@/lib/supabase";
import type { AgentAdminRepository } from "@/modules/agents/admin";

function toLineAgentUpdate(update: Record<string, unknown>): TablesUpdate<"line_agents"> {
  const row: TablesUpdate<"line_agents"> = {};
  if (typeof update.enabled === "boolean") row.enabled = update.enabled;
  if (typeof update.updated_at === "string") row.updated_at = update.updated_at;
  if (update.settings !== undefined) {
    if (!isDatabaseJson(update.settings)) throw new Error("Agent settings must be JSON serializable");
    row.settings = update.settings;
  }
  return row;
}

export function createSupabaseAgentAdminRepository(): AgentAdminRepository {
  let supabase: ReturnType<typeof getMainSupabase> | undefined;
  const client = () => (supabase ??= getMainSupabase());

  return {
    async getBySlug(slug) {
      const { data, error } = await client().from("line_agents").select("*").eq("slug", slug).single();
      return { data: data ?? null, errorMessage: error?.message ?? null };
    },
    async updateBySlug(slug, update) {
      const row = toLineAgentUpdate(update);
      const { data, error } = await client()
        .from("line_agents")
        .update(row)
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
