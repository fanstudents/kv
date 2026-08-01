import "server-only";
import { listWeekOverview } from "@/lib/google";
import { getMainSupabase } from "@/lib/supabase";
import { supabaseOperationsRepository } from "@/adapters/operations/supabase-operations-repository";
import type { TvIdleDataSources } from "@/modules/tv/idle";

export function createTvIdleDataSources(): TvIdleDataSources {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    listWeekOverview,
    getAvailableTags: () => supabaseOperationsRepository.list(),
    async listRecentActivity(cutoff) {
      const { data } = await getClient()
        .from("line_agent_activity")
        .select("agent_slug,status,occurred_at")
        .gte("occurred_at", cutoff)
        .order("occurred_at", { ascending: false })
        .limit(500);
      return (data ?? []) as { agent_slug: string | null; status: string }[];
    },
  };
}
