import "server-only";

import { getMainSupabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import type {
  ContactProfileRow,
  VisitProfileLink,
  VisitResearchRepository,
} from "@/modules/visit/research";

function profileLinks(value: Json): VisitProfileLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];
    if (typeof item.label !== "string" || typeof item.url !== "string") return [];
    return [{
      label: item.label,
      url: item.url,
      ...(typeof item.kind === "string" ? { kind: item.kind } : {}),
    }];
  });
}

function stringList(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function createSupabaseVisitResearchRepository(): VisitResearchRepository {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
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
      return data?.id ?? null;
    },

    async storeProfile({ input, profile, status, runId }) {
      const links: Json = profile.links.map((link) => ({
        label: link.label,
        url: link.url,
        ...(link.kind ? { kind: link.kind } : {}),
      }));
      const { data, error } = await getClient()
        .from("contact_profiles")
        .insert({
          contact_id: input.contactId,
          invite_id: input.inviteId ?? null,
          person_name: input.name,
          company: input.company,
          company_summary: profile.companySummary || null,
          person_summary: profile.personSummary || null,
          links,
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
      return data.id;
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
        return (data ?? []).map((row): ContactProfileRow => ({
          ...row,
          links: profileLinks(row.links),
          highlights: stringList(row.highlights),
          talking_points: stringList(row.talking_points),
          sources: stringList(row.sources),
        }));
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
