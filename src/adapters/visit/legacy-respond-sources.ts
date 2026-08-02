import "server-only";
import { pushLineMessage as pushLegacyLineMessage } from "@/lib/line";
import { getMainSupabase } from "@/lib/supabase";
import { legacyVisitProviders } from "@/adapters/visit/legacy-provider-adapter";
import { createSupabaseVisitSettings } from "@/adapters/visit/supabase-visit-settings";
import {
  toLegacyPendingInviteConfirmationPatch,
  toLegacyPendingInviteFulfilmentPatch,
  toLegacyPendingInviteStatusPatch,
  type LegacyPendingInviteRow,
} from "@/modules/visit/legacy-schema";
import type {
  VisitRespondEmailParams,
  VisitRespondFulfilmentRow,
  VisitRespondFulfilmentSource,
  VisitRespondReadSource,
} from "@/modules/visit/respond-contracts";
import type { VisitInviteChoice } from "@/modules/visit/public-response";

export interface LegacyVisitRespondSources {
  read: VisitRespondReadSource;
  fulfilment: VisitRespondFulfilmentSource;
}

/**
 * Builds the two distinct public-response ports from one lazy Main DB client.
 * Read and fulfilment remain separate contracts; only their composition plumbing
 * is shared so a POST does not duplicate the same client boundary.
 */
export function createLegacyVisitRespondSources(): LegacyVisitRespondSources {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };
  const settings = createSupabaseVisitSettings();

  return {
    fulfilment: {
      getSettings: settings.get,
      createCalendarEvent: legacyVisitProviders.createCalendarEvent,
      async updateInviteFulfilled(inviteId, calendarEventId, location) {
        await getClient()
          .from("pending_invites")
          .update(toLegacyPendingInviteFulfilmentPatch(calendarEventId, location))
          .eq("id", inviteId);
      },
      async sendThankYouEmail(params: VisitRespondEmailParams) {
        await legacyVisitProviders.sendEmail(params);
      },
      async pushLineMessage(to, text) {
        await pushLegacyLineMessage(to, text);
      },
      async recordActivity(activity) {
        await getClient().from("line_agent_activity").insert({
          agent_slug: activity.agent_slug ?? "visit",
          summary: activity.summary,
          status: activity.status,
        });
      },
      async markInviteFailed(inviteId) {
        await getClient()
          .from("pending_invites")
          .update(toLegacyPendingInviteStatusPatch("failed"))
          .eq("id", inviteId);
      },
    },
    read: {
      async findInvite(inviteId) {
        const { data } = await getClient().from("pending_invites").select("*").eq("id", inviteId).maybeSingle();
        return data as LegacyPendingInviteRow | null;
      },
      async confirmInvite(inviteId, choice: VisitInviteChoice, resolvedAt) {
        const { data } = await getClient()
          .from("pending_invites")
          .update(toLegacyPendingInviteConfirmationPatch(choice, resolvedAt))
          .eq("id", inviteId)
          .eq("status", "pending")
          .select("*")
          .maybeSingle();
        return data as LegacyPendingInviteRow | null;
      },
      async refetchInvite(inviteId) {
        const { data } = await getClient().from("pending_invites").select("*").eq("id", inviteId).single();
        return data as LegacyPendingInviteRow;
      },
      async findInviteForFulfilment(inviteId) {
        const { data } = await getClient()
          .from("pending_invites")
          .select("*, contacts(name, title, email, company)")
          .eq("id", inviteId)
          .maybeSingle();
        return data as VisitRespondFulfilmentRow | null;
      },
    },
  };
}
