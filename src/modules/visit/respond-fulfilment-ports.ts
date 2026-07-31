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

export interface VisitRespondResearchInput {
  contactId: string | null;
  inviteId: string;
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
}

export interface VisitRespondFulfilmentPort {
  getSettings(): Promise<VisitRespondAgentSettings>;
  createCalendarEvent(params: VisitRespondCalendarEventParams): Promise<string>;
  updateInviteFulfilled(inviteId: string, calendarEventId: string, location: string | undefined): Promise<void>;
  sendThankYouEmail(params: VisitRespondEmailParams): Promise<void>;
  pushLineMessage(to: string, text: string): Promise<void>;
  recordActivity(activity: { agent_slug?: string; summary: string; status: "success" | "failed" }): Promise<void>;
  markInviteFailed(inviteId: string): Promise<void>;
  researchContact(input: VisitRespondResearchInput): Promise<string | null>;
}
