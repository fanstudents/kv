import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { VisitLiveTaskHistoryRepository } from "@/modules/live-task/visit-history";

export function createSupabaseVisitLiveTaskHistoryRepository(): VisitLiveTaskHistoryRepository {
  return {
    async listContacts(limit) {
      const { data } = await getSupabase()
        .from("contacts")
        .select("id,name,company,created_at")
        .eq("source", "line_card")
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []).map((contact: { id: string; name: string; company: string | null; created_at: string }) => ({
        id: contact.id,
        name: contact.name,
        company: contact.company ?? null,
        createdAt: contact.created_at,
      }));
    },
    async listOffers(contactIds) {
      const { data } = await getSupabase()
        .from("visit_offers")
        .select("contact_id,status,created_at")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });
      return (data ?? []).map((offer: { contact_id: string; status: string; created_at: string }) => ({
        contactId: offer.contact_id,
        status: offer.status,
        createdAt: offer.created_at,
      }));
    },
    async listInvites(contactIds) {
      const { data } = await getSupabase()
        .from("pending_invites")
        .select("contact_id,status,created_at")
        .in("contact_id", contactIds)
        .order("created_at", { ascending: false });
      return (data ?? []).map((invite: { contact_id: string; status: string; created_at: string }) => ({
        contactId: invite.contact_id,
        status: invite.status,
        createdAt: invite.created_at,
      }));
    },
  };
}
