import "server-only";
import { researchContact } from "@/lib/contact-research";
import { pushLineMessage as pushLegacyLineMessage } from "@/lib/line";
import { getSupabase } from "@/lib/supabase";
import { getVisitAgentSettings } from "@/lib/visit-settings";
import { legacyVisitProviders } from "@/adapters/visit/legacy-provider-adapter";
import {
  toLegacyPendingInviteFulfilmentPatch,
  toLegacyPendingInviteStatusPatch,
} from "@/modules/visit/legacy-schema";
import type {
  VisitRespondEmailParams,
  VisitRespondFulfilmentPort,
  VisitRespondResearchInput,
} from "@/modules/visit/respond-fulfilment-ports";

export function createLegacyVisitRespondFulfilmentAdapter(): VisitRespondFulfilmentPort {
  let supabase: ReturnType<typeof getSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    getSettings: () => getVisitAgentSettings(getClient()),
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
    researchContact: (input: VisitRespondResearchInput) => researchContact(input),
  };
}
