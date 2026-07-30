import {
  draftInviteEmail,
  interpretCardReply,
  parseBusinessCard,
  reviseInviteEmail,
} from "@/lib/openai";
import { createCalendarEvent, findFreeSlots, sendGmail } from "@/lib/google";
import type { VisitProviderPort } from "@/modules/visit/provider-port";

export const legacyVisitProviders: VisitProviderPort = {
  parseBusinessCard,
  interpretCardReply,
  draftInviteEmail,
  reviseInviteEmail,
  findFreeSlots,
  sendEmail: sendGmail,
  createCalendarEvent,
};
