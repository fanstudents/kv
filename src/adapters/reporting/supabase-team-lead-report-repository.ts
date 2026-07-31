import "server-only";

import type { getSupabase } from "@/lib/supabase";
import type {
  TeamLeadReportActivity,
  TeamLeadReportRepository,
} from "@/modules/reporting/team-lead";

type SupabaseTeamLeadReportClient = ReturnType<typeof getSupabase>;

export function createSupabaseTeamLeadReportRepository(
  supabase: SupabaseTeamLeadReportClient
): TeamLeadReportRepository {
  return {
    async getAgentConfig() {
      const { data } = await supabase
        .from("line_agents")
        .select("enabled, settings")
        .eq("slug", "teamlead")
        .single();
      return data;
    },
    async listActivities(cutoff) {
      const { data } = await supabase
        .from("line_agent_activity")
        .select("agent_slug, occurred_at, summary, status")
        .gte("occurred_at", cutoff)
        .neq("agent_slug", "teamlead")
        .order("occurred_at", { ascending: false })
        .limit(200);
      return (data ?? []) as TeamLeadReportActivity[];
    },
    async recordActivity(activity) {
      await supabase.from("line_agent_activity").insert({
        agent_slug: "teamlead",
        summary: activity.summary,
        status: activity.status,
      });
    },
  };
}
