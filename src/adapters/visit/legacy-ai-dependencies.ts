import "server-only";
import { legacyVisitProviders } from "./legacy-provider-adapter";
import { getSupabase } from "@/lib/supabase";
import type { VisitAiDependencies } from "@/modules/visit/ai";

export function createLegacyVisitAiDependencies(): VisitAiDependencies {
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
