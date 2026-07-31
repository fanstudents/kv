import "server-only";

import { getSupabase } from "@/lib/supabase";
import { getVisitAgentSettings } from "@/lib/visit-settings";
import type { VisitSettingsPort } from "@/modules/visit/settings-ports";

export function createLegacyVisitSettingsAdapter(): VisitSettingsPort {
  let supabase: ReturnType<typeof getSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    get: () => getVisitAgentSettings(getClient()),
  };
}
