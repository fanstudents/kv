import "server-only";
import { listWeekOverview } from "@/lib/google";
import { getSupabase } from "@/lib/supabase";
import { supabaseOperationsRepository } from "@/adapters/operations/supabase-operations-repository";
import type { TvIdlePort } from "@/modules/tv/idle-ports";

export function createLegacyTvIdleAdapter(): TvIdlePort {
  let supabase: ReturnType<typeof getSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getSupabase();
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
