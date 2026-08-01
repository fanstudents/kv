import "server-only";

import { getMainSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import {
  toLegacyPendingInviteInsert,
  toLegacyPendingInviteRevisionPatch,
  toLegacyPendingInviteStatusPatch,
  toLegacyVisitOfferResolution,
  type LegacyPreparedInvite,
} from "@/modules/visit/legacy-schema";
import type {
  VisitLineApprovalInvite,
  VisitLineContactDetails,
  VisitLineContactField,
  VisitLineOfferConversation,
  VisitLineOfferResolution,
  VisitLinePendingInviteStatus,
  VisitLineWorkflowPersistencePort,
  VisitStaleOffer,
  VisitStaleOfferQuery,
} from "@/modules/visit/line-contracts";

type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

function contactFieldPatch(field: VisitLineContactField, value: string): ContactUpdate {
  switch (field) {
    case "name":
      return { name: value };
    case "company":
      return { company: value };
    case "title":
      return { title: value };
    case "email":
      return { email: value };
    case "phone":
      return { phone: value };
  }
}

function contactDetails(value: unknown): VisitLineContactDetails | null {
  return (value as VisitLineContactDetails | null) ?? null;
}

export function createLegacyVisitLineWorkflowAdapter(): VisitLineWorkflowPersistencePort {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    async findPendingOffer(lineUserId): Promise<VisitLineOfferConversation | null> {
      const { data } = await getClient()
        .from("visit_offers")
        .select("*, contacts(id, name, title, company, email, phone)")
        .eq("line_user_id", lineUserId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      return { id: data.id, contact: contactDetails(data.contacts) };
    },

    async findStaleOffers(query: VisitStaleOfferQuery): Promise<readonly VisitStaleOffer[]> {
      const { data } = await getClient()
        .from("visit_offers")
        .select("id, line_user_id, contact_id, contacts(name)")
        .eq("status", "pending")
        .lt("created_at", query.olderThan)
        .gt("created_at", query.notOlderThan)
        .limit(query.limit);

      return (data ?? []).map((offer) => ({
        id: offer.id,
        lineUserId: offer.line_user_id ?? null,
        contactId: offer.contact_id ?? null,
        contactName: offer.contacts?.name ?? null,
      }));
    },

    async resolveOffer(id, outcome: VisitLineOfferResolution, resolvedAt) {
      await getClient().from("visit_offers").update(toLegacyVisitOfferResolution(outcome, resolvedAt)).eq("id", id);
    },
    async updateContactField(contactId, field: VisitLineContactField, value) {
      await getClient().from("contacts").update(contactFieldPatch(field, value)).eq("id", contactId);
    },
    async findContact(contactId) {
      const { data } = await getClient()
        .from("contacts")
        .select("id, name, title, company, email")
        .eq("id", contactId)
        .single();
      return contactDetails(data);
    },
    async createPendingInvite(lineUserId, invite: LegacyPreparedInvite) {
      const { data, error } = await getClient()
        .from("pending_invites")
        .insert(toLegacyPendingInviteInsert(lineUserId, invite))
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? "Failed to create pending invite");
      return { id: data.id };
    },
    async findPendingApprovalInvite(lineUserId): Promise<VisitLineApprovalInvite | null> {
      const { data } = await getClient()
        .from("pending_invites")
        .select("*, contacts(id, name, title, company, email)")
        .eq("line_user_id", lineUserId)
        .eq("status", "awaiting_approval")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      return {
        id: data.id,
        body: data.body,
        subject: data.subject,
        slot1: data.slot1,
        slot2: data.slot2,
        contact: contactDetails(data.contacts),
      };
    },
    async updateInviteStatus(id, status: VisitLinePendingInviteStatus) {
      await getClient().from("pending_invites").update(toLegacyPendingInviteStatusPatch(status)).eq("id", id);
    },
    async updateInviteDraft(id, subject, body) {
      await getClient().from("pending_invites").update(toLegacyPendingInviteRevisionPatch(subject, body)).eq("id", id);
    },
  };
}
