import "server-only";
import { listContactProfiles, researchContact } from "@/lib/contact-research";
import { getSupabase } from "@/lib/supabase";
import type { VisitResearchPort } from "@/modules/visit/research-ports";

export function createLegacyVisitResearchAdapter(): VisitResearchPort {
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
