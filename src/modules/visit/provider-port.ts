export interface VisitBusinessCard {
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
}

export type VisitCardReplyIntent =
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "correction"; field: keyof VisitBusinessCard; value: string }
  | { type: "other" };

export interface VisitEmailDraft {
  subject: string;
  body: string;
}

export interface VisitFreeSlot {
  start: string;
  end: string;
  label: string;
}

export interface VisitProviderPort {
  parseBusinessCard(imageDataUrl: string): Promise<VisitBusinessCard>;
  interpretCardReply(params: {
    currentCard: VisitBusinessCard;
    userText: string;
  }): Promise<VisitCardReplyIntent>;
  draftInviteEmail(params: {
    contactName: string;
    contactTitle?: string;
    company?: string;
    meetingType: string;
    slot1: string;
    slot2: string;
    senderName: string;
  }): Promise<VisitEmailDraft>;
  reviseInviteEmail(params: {
    contactName: string;
    contactTitle?: string;
    company?: string;
    meetingType: string;
    senderName: string;
    previousSubject: string;
    previousBody: string;
    instruction: string;
  }): Promise<VisitEmailDraft>;
  findFreeSlots(params: {
    rangeStartDays: number;
    rangeEndDays: number;
    workingHoursStart: string;
    workingHoursEnd: string;
    meetingDurationMinutes: number;
    slotCount: number;
  }): Promise<VisitFreeSlot[]>;
  sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    html?: boolean;
  }): Promise<void>;
  createCalendarEvent(params: {
    summary: string;
    description?: string;
    location?: string;
    startISO: string;
    endISO: string;
    attendeeEmail: string;
  }): Promise<string>;
}
