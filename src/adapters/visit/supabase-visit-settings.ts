import "server-only";

import { getMainSupabase } from "@/lib/supabase";
import { parseVisitRuntimeSettings } from "@/modules/visit/settings";
import type { VisitSettings, VisitSettingsPort } from "@/modules/visit/settings-ports";

export function createSupabaseVisitSettings(): VisitSettingsPort {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    async get(): Promise<VisitSettings> {
      const { data, error } = await getClient()
        .from("line_agents")
        .select("settings")
        .eq("slug", "visit")
        .single();
      if (error) throw new Error(`Visit settings read failed: ${error.message}`);
      return parseVisitRuntimeSettings(data?.settings);
    },
  };
}
