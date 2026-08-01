import "server-only";

import { getLineMessageContentAsDataUrl, pushLineMessage, replyLineMessage, replyLineRawMessages } from "@/lib/line";
import { getMainSupabase } from "@/lib/supabase";
import {
  toLegacyContactInsert,
  toLegacyVisitOfferInsert,
} from "@/modules/visit/legacy-schema";
import type {
  VisitLineActivityPort,
  VisitLineCardPersistencePort,
  VisitLineDeliveryPort,
  VisitLineImagePort,
} from "@/modules/visit/line-contracts";
import type { VisitBusinessCard } from "@/modules/visit/provider-port";
import { legacyVisitProviders } from "./legacy-provider-adapter";

/**
 * Legacy LINE/Supabase translations used by the Visit workflow.
 *
 * These adapters are deliberately colocated: each is a thin compatibility
 * translation for the same bounded workflow, not an independently reusable
 * application layer.
 */
export function createLegacyVisitLineImageAdapter(): VisitLineImagePort {
  return {
    getImageDataUrl: getLineMessageContentAsDataUrl,
    parseBusinessCard: legacyVisitProviders.parseBusinessCard,
  };
}

export function createLegacyVisitLineDeliveryAdapter(): VisitLineDeliveryPort {
  return {
    async replyText(replyToken, text) {
      await replyLineMessage(replyToken, text);
    },
    async replyMessages(replyToken, messages) {
      await replyLineRawMessages(replyToken, messages);
    },
    async pushText(lineUserId, text) {
      await pushLineMessage(lineUserId, text);
    },
  };
}

export function createLegacyVisitLineCardAdapter(): VisitLineCardPersistencePort {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    async createContact(contact: VisitBusinessCard, lineUserId) {
      const { data } = await getClient()
        .from("contacts")
        .insert(toLegacyContactInsert(contact, lineUserId))
        .select()
        .single();
      return data ? { id: data.id } : null;
    },
    async createOffer(lineUserId, contactId) {
      const { data } = await getClient()
        .from("visit_offers")
        .insert(toLegacyVisitOfferInsert(lineUserId, contactId))
        .select()
        .single();
      return data ? { id: data.id } : null;
    },
  };
}

export function createLegacyVisitLineActivityAdapter(): VisitLineActivityPort {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    async record(activity) {
      await getClient().from("line_agent_activity").insert(activity);
    },
  };
}
