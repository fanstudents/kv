export type LegacyVisitOfferStatus = "pending" | "accepted" | "declined";
export type LegacyVisitTimeoutPhase =
  | "resolved"
  | "activity_recorded"
  | "line_notified"
  | "completed";
export type LegacyPendingInviteStatus =
  | "awaiting_approval"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "failed";

/**
 * Durable checkpoints for the public invite's external side effects.
 * The phase records the last completed step, so a later POST can resume
 * without recreating work that already has a receipt.
 */
export type LegacyPendingInviteFulfilmentPhase =
  | "calendar_created"
  | "email_sent"
  | "line_notified"
  | "completed";

export interface LegacyContactRow {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  source?: string | null;
  line_user_id?: string | null;
}

/** Input accepted by the legacy contact row mapper; it is intentionally not a runtime state-machine entity. */
export interface LegacyContactInput {
  name: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
}

export interface LegacyVisitOfferRow {
  id: string;
  line_user_id: string;
  contact_id: string | null;
  status: LegacyVisitOfferStatus;
  created_at?: string;
  resolved_at?: string | null;
  timeout_phase?: LegacyVisitTimeoutPhase | null;
  timeout_error?: string | null;
}

export interface LegacyPendingInviteRow {
  id: string;
  line_user_id: string;
  contact_id: string;
  to_email: string;
  subject: string;
  body: string;
  slot1: string;
  slot2: string;
  slot1_start: string;
  slot1_end: string;
  slot2_start: string;
  slot2_end: string;
  status: LegacyPendingInviteStatus;
  chosen_slot?: "1" | "2" | "both" | null;
  resolved_at?: string | null;
  calendar_event_id?: string | null;
  location?: string | null;
  fulfilment_phase?: LegacyPendingInviteFulfilmentPhase | null;
  fulfilment_error?: string | null;
}

export interface LegacyPreparedInvite {
  id?: string;
  contactId: string;
  toEmail: string;
  subject: string;
  body: string;
  slots: readonly [
    { label: string; start: string; end: string },
    { label: string; start: string; end: string },
  ];
  requiresApproval: boolean;
}

export function toLegacyContactInsert(contact: LegacyContactInput, lineUserId: string) {
  return {
    name: contact.name || "（未命名聯絡人）",
    company: contact.company || null,
    title: contact.title || null,
    email: contact.email || null,
    phone: contact.phone || null,
    source: "line_card" as const,
    line_user_id: lineUserId,
  };
}

export function toLegacyVisitOfferInsert(
  lineUserId: string,
  contactId: string | undefined
) {
  return {
    line_user_id: lineUserId,
    contact_id: contactId ?? null,
    status: "pending" as const,
  };
}

export function toLegacyVisitOfferResolution(
  outcome: "accepted" | "declined" | "timed_out",
  resolvedAt: string
) {
  const patch = {
    status: outcome === "accepted" ? ("accepted" as const) : ("declined" as const),
    resolved_at: resolvedAt,
  };
  return outcome === "timed_out"
    ? { ...patch, timeout_phase: "resolved" as const, timeout_error: null }
    : patch;
}

export function toLegacyVisitOfferTimeoutPhasePatch(phase: LegacyVisitTimeoutPhase) {
  return { timeout_phase: phase, timeout_error: null };
}

export function toLegacyVisitOfferTimeoutErrorPatch(message: string) {
  return { timeout_error: message.slice(0, 1000) };
}

export function toLegacyPendingInviteInsert(
  lineUserId: string,
  invite: LegacyPreparedInvite
) {
  const [slot1, slot2] = invite.slots;
  return {
    line_user_id: lineUserId,
    contact_id: invite.contactId,
    to_email: invite.toEmail,
    subject: invite.subject,
    body: invite.body,
    slot1: slot1.label,
    slot2: slot2.label,
    slot1_start: slot1.start,
    slot1_end: slot1.end,
    slot2_start: slot2.start,
    slot2_end: slot2.end,
    status: invite.requiresApproval ? ("awaiting_approval" as const) : ("pending" as const),
  };
}

export function toLegacyPendingInviteStatusPatch(
  status: Extract<LegacyPendingInviteStatus, "pending" | "cancelled" | "failed">
) {
  return { status };
}

export function toLegacyPendingInviteRevisionPatch(subject: string, body: string) {
  return { subject, body };
}

export function toLegacyPendingInviteConfirmationPatch(
  choice: NonNullable<LegacyPendingInviteRow["chosen_slot"]>,
  resolvedAt: string
) {
  return {
    status: "confirmed" as const,
    chosen_slot: choice,
    resolved_at: resolvedAt,
  };
}

export function toLegacyPendingInviteFulfilmentPatch(
  calendarEventId: string,
  location: string | undefined
) {
  return {
    calendar_event_id: calendarEventId,
    location: location ?? null,
    fulfilment_phase: "calendar_created" as const,
    fulfilment_error: null,
  };
}

export function toLegacyPendingInviteFulfilmentPhasePatch(
  phase: LegacyPendingInviteFulfilmentPhase,
) {
  return {
    fulfilment_phase: phase,
    fulfilment_error: null,
  };
}

export function toLegacyPendingInviteFulfilmentErrorPatch(message: string) {
  return {
    fulfilment_error: message.slice(0, 1000),
  };
}
