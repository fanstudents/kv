import "server-only";

import type { getMainSupabase } from "@/lib/supabase";
import type {
  TeamLeadReportActivity,
  TeamLeadReportRepository,
} from "@/modules/reporting/team-lead";

type SupabaseTeamLeadReportClient = ReturnType<typeof getMainSupabase>;

export function createSupabaseTeamLeadReportRepository(
  supabase: SupabaseTeamLeadReportClient
): TeamLeadReportRepository {
  return {
    async getAgentConfig() {
      const { data, error } = await supabase
        .from("line_agents")
        .select("enabled, settings")
        .eq("slug", "teamlead")
        .single();
      if (error) throw new Error(`Team Lead config read failed: ${error.message}`);
      return data;
    },
    async listActivities(cutoff) {
      const { data, error } = await supabase
        .from("line_agent_activity")
        .select("agent_slug, occurred_at, summary, status")
        .gte("occurred_at", cutoff)
        .neq("agent_slug", "teamlead")
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(`Team Lead activity read failed: ${error.message}`);
      return (data ?? []) as TeamLeadReportActivity[];
    },
    async recordActivity(activity) {
      const { error } = await supabase.from("line_agent_activity").insert({
        agent_slug: "teamlead",
        summary: activity.summary,
        status: activity.status,
      });
      if (error) throw new Error(`Team Lead activity write failed: ${error.message}`);
    },
  };
}
