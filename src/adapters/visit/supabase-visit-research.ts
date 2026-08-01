import "server-only";

import { getSupabase } from "@/lib/supabase";
import type {
  ContactProfileRow,
  VisitResearchRepository,
} from "@/modules/visit/research";

export function createSupabaseVisitResearchRepository(): VisitResearchRepository {
  let supabase: ReturnType<typeof getSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    async findContact(contactId) {
      const { data } = await getClient()
        .from("contacts")
        .select("name,company,title,email")
        .eq("id", contactId)
        .maybeSingle();
      return data;
    },

    async findRecentCompletedProfile(contactId, sinceIso) {
      const { data } = await getClient()
        .from("contact_profiles")
        .select("id")
        .eq("contact_id", contactId)
        .eq("status", "done")
        .gte("created_at", sinceIso)
        .maybeSingle();
      return (data?.id as string) ?? null;
    },

    async storeProfile({ input, profile, status, runId }) {
      const { data, error } = await getClient()
        .from("contact_profiles")
        .insert({
          contact_id: input.contactId,
          invite_id: input.inviteId ?? null,
          person_name: input.name,
          company: input.company,
          company_summary: profile.companySummary || null,
          person_summary: profile.personSummary || null,
          links: profile.links,
          highlights: profile.highlights,
          talking_points: profile.talkingPoints,
          sources: profile.sources,
          confidence: profile.confidence,
          status,
          run_id: runId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },

    async storeFailure({ input, errorDetail, runId }) {
      await getClient().from("contact_profiles").insert({
        contact_id: input.contactId,
        invite_id: input.inviteId ?? null,
        person_name: input.name,
        company: input.company,
        status: "failed",
        error_detail: errorDetail,
        run_id: runId,
      });
    },

    async listProfiles(limit) {
      try {
        const { data } = await getClient()
          .from("contact_profiles")
          .select(
            "id,person_name,company,company_summary,person_summary,links,highlights,talking_points,sources,confidence,status,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(limit);
        return (data ?? []) as ContactProfileRow[];
      } catch {
        return [];
      }
    },

    async recordActivity(activity) {
      await getClient().from("line_agent_activity").insert({
        agent_slug: "visit",
        summary: activity.summary,
        status: activity.status,
      });
    },
  };
}
