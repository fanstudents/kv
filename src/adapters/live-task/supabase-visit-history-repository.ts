import "server-only";
import { getMainSupabase } from "@/lib/supabase";
import type { VisitLiveTaskHistoryRepository } from "@/modules/live-task/visit-history";

export function createSupabaseVisitLiveTaskHistoryRepository(): VisitLiveTaskHistoryRepository {
  return {
    async listContacts(limit) {
      const { data } = await getMainSupabase()
        .from("contacts")
        .select("id,name,company,created_at")
        .eq("source", "line_card")
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []).map((contact) => ({
        id: contact.id,
        name: contact.name,
        company: contact.company ?? null,
        createdAt: contact.created_at,
      }));
    },
    async listOffers(contactIds) {
      const { data } = await getMainSupabase()
        .from("visit_offers")
        .select("contact_id,status,created_at")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });
      return (data ?? []).flatMap((offer) =>
        offer.contact_id
          ? [{ contactId: offer.contact_id, status: offer.status, createdAt: offer.created_at }]
          : []
      );
    },
    async listInvites(contactIds) {
      const { data } = await getMainSupabase()
        .from("pending_invites")
        .select("contact_id,status,created_at")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });
      return (data ?? []).flatMap((invite) =>
        invite.contact_id
          ? [{ contactId: invite.contact_id, status: invite.status, createdAt: invite.created_at }]
          : []
      );
    },
  };
}
