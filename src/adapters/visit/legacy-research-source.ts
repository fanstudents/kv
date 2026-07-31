import "server-only";
import { listContactProfiles, researchContact } from "@/lib/contact-research";
import { getSupabase } from "@/lib/supabase";
import type { VisitResearchSource } from "@/modules/visit/research";

export function createLegacyVisitResearchSource(): VisitResearchSource {
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
    research: researchContact,
    listProfiles: listContactProfiles,
  };
}
