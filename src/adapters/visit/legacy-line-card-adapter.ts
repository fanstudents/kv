import "server-only";
import { getSupabase } from "@/lib/supabase";
import { toLegacyContactInsert, toLegacyVisitOfferInsert, type LegacyContactRow, type LegacyVisitOfferRow } from "@/modules/visit/legacy-schema";
import type { VisitLineCardPersistencePort } from "@/modules/visit/line-card-ports";
import type { VisitBusinessCard } from "@/modules/visit/provider-port";

export function createLegacyVisitLineCardAdapter(): VisitLineCardPersistencePort {
  let supabase: ReturnType<typeof getSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    async createContact(contact: VisitBusinessCard, lineUserId) {
      const { data } = await getClient()
        .from("contacts")
        .insert(toLegacyContactInsert(contact, lineUserId))
        .select()
        .single();
      return data as Pick<LegacyContactRow, "id"> | null;
    },
    async createOffer(lineUserId, contactId) {
      const { data } = await getClient()
        .from("visit_offers")
        .insert(toLegacyVisitOfferInsert(lineUserId, contactId))
        .select()
        .single();
      return data as Pick<LegacyVisitOfferRow, "id"> | null;
    },
  };
}
