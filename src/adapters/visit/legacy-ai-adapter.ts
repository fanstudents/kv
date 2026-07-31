import "server-only";
import { legacyVisitProviders } from "./legacy-provider-adapter";
import { getSupabase } from "@/lib/supabase";
import type { VisitAiPort } from "@/modules/visit/ai-ports";

export function createLegacyVisitAiAdapter(): VisitAiPort {
  const supabase = getSupabase();
  return {
    parseBusinessCard: legacyVisitProviders.parseBusinessCard,
    draftInviteEmail: legacyVisitProviders.draftInviteEmail,
    async recordActivity(activity) {
      await supabase.from("line_agent_activity").insert({
        agent_slug: "visit",
        summary: activity.summary,
        status: activity.status,
      });
    },
  };
}
