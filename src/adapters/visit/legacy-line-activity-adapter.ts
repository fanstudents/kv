import "server-only";

import { getSupabase } from "@/lib/supabase";
import type { VisitLineActivityPort } from "@/modules/visit/line-activity-ports";

export function createLegacyVisitLineActivityAdapter(): VisitLineActivityPort {
  let supabase: ReturnType<typeof getSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    async record(activity) {
      await getClient().from("line_agent_activity").insert(activity);
    },
  };
}
