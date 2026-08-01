import "server-only";
import type { Json, TablesUpdate } from "@/lib/database.types";
import { getMainSupabase } from "@/lib/supabase";
import type { AgentAdminRepository } from "@/modules/agents/admin";

function isJson(value: unknown): value is Json {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJson);
  if (typeof value !== "object") return false;
  return Object.values(value).every(isJson);
}

function toLineAgentUpdate(update: Record<string, unknown>): TablesUpdate<"line_agents"> {
  const row: TablesUpdate<"line_agents"> = {};
  if (typeof update.enabled === "boolean") row.enabled = update.enabled;
  if (typeof update.updated_at === "string") row.updated_at = update.updated_at;
  if (isJson(update.settings)) row.settings = update.settings;
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
      const { data, error } = await client()
        .from("line_agents")
        .update(toLineAgentUpdate(update))
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
