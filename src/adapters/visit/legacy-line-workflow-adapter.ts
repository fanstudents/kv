import "server-only";

import { getSupabase } from "@/lib/supabase";
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
} from "@/modules/visit/line-workflow-ports";

function contactDetails(value: unknown): VisitLineContactDetails | null {
  return (value as VisitLineContactDetails | null) ?? null;
}

export function createLegacyVisitLineWorkflowAdapter(): VisitLineWorkflowPersistencePort {
  let supabase: ReturnType<typeof getSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getSupabase();
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
      return { id: data.id as string, contact: contactDetails(data.contacts) };
    },
    async resolveOffer(id, outcome: VisitLineOfferResolution, resolvedAt) {
      await getClient().from("visit_offers").update(toLegacyVisitOfferResolution(outcome, resolvedAt)).eq("id", id);
    },
    async updateContactField(contactId, field: VisitLineContactField, value) {
      await getClient().from("contacts").update({ [field]: value }).eq("id", contactId);
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
      const { data } = await getClient()
        .from("pending_invites")
        .insert(toLegacyPendingInviteInsert(lineUserId, invite))
        .select()
        .single();
      return data as { id: string };
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
        id: data.id as string,
        body: data.body as string,
        subject: data.subject as string,
        slot1: data.slot1 as string,
        slot2: data.slot2 as string,
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
