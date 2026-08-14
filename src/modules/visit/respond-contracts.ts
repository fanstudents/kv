import type { VisitResearchInput } from "@/modules/visit/research";
import type {
  LegacyPendingInviteFulfilmentPhase,
  LegacyPendingInviteRow,
} from "@/modules/visit/legacy-schema";

export interface VisitRespondAgentSettings {
  rangeStartDays: number;
  rangeEndDays: number;
  meetingDuration: number;
  meetingType: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  senderName: string;
  requireApproval: boolean;
}

export interface VisitRespondCalendarEventParams {
  summary: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO: string;
  attendeeEmail: string;
}

export interface VisitRespondEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: boolean;
}

export type VisitRespondResearchInput = VisitResearchInput & { inviteId: string };

export interface VisitRespondFulfilmentSource {
  getSettings(): Promise<VisitRespondAgentSettings>;
  createCalendarEvent(params: VisitRespondCalendarEventParams): Promise<string>;
  updateInviteFulfilled(inviteId: string, calendarEventId: string, location: string | undefined): Promise<void>;
  markInviteFulfilmentPhase(inviteId: string, phase: LegacyPendingInviteFulfilmentPhase): Promise<void>;
  recordInviteFulfilmentError(inviteId: string, message: string): Promise<void>;
  sendThankYouEmail(params: VisitRespondEmailParams): Promise<void>;
  pushLineMessage(to: string, text: string): Promise<void>;
  recordActivity(activity: { agent_slug?: string; summary: string; status: "success" | "failed" }): Promise<void>;
}
import type { VisitInviteChoice } from "@/modules/visit/public-response";

export type VisitRespondFulfilmentRow = LegacyPendingInviteRow & { contacts: unknown };

export interface VisitRespondReadSource {
  findInvite(inviteId: string): Promise<LegacyPendingInviteRow | null>;
  confirmInvite(
    inviteId: string,
    choice: VisitInviteChoice,
    resolvedAt: string,
  ): Promise<LegacyPendingInviteRow | null>;
  refetchInvite(inviteId: string): Promise<LegacyPendingInviteRow>;
  findInviteForFulfilment(inviteId: string): Promise<VisitRespondFulfilmentRow | null>;
}
