import "server-only";

import type { getMainSupabase } from "@/lib/supabase";
import type {
  SupportConversation,
  SupportReportRepository,
} from "@/modules/support/report";

type SupabaseSupportReportClient = ReturnType<typeof getMainSupabase>;

export function createSupabaseSupportReportRepository(
  supabase: SupabaseSupportReportClient
): SupportReportRepository {
  return {
    async getAgentConfig() {
      const { data, error } = await supabase
        .from("line_agents")
        .select("enabled, settings")
        .eq("slug", "support")
        .single();
      if (error) throw new Error(`Support config read failed: ${error.message}`);
      return data;
    },
    async listCustomerMessages(cutoff) {
      const { data, error } = await supabase
        .from("line_support_conversations")
        .select("line_user_id, text, occurred_at")
        .eq("role", "customer")
        .gte("occurred_at", cutoff)
        .order("occurred_at", { ascending: true })
        .limit(500);
      if (error) throw new Error(`Support conversation read failed: ${error.message}`);
      return (data ?? []) as SupportConversation[];
    },
    async getDisplayNames(lineUserIds) {
      const { data, error } = await supabase
        .from("line_subscribers")
        .select("line_user_id, display_name")
        .eq("channel", "support")
        .in("line_user_id", lineUserIds);
      if (error) throw new Error(`Support subscriber read failed: ${error.message}`);
      return new Map(
        (data ?? []).map((subscriber) => [
          subscriber.line_user_id as string,
          subscriber.display_name as string | null,
        ])
      );
    },
    async recordActivity(activity) {
      const { error } = await supabase.from("line_agent_activity").insert({
        agent_slug: "support",
        summary: activity.summary,
        status: activity.status,
      });
      if (error) throw new Error(`Support activity write failed: ${error.message}`);
    },
  };
}
