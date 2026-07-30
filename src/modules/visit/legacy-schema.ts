import type { VisitContact, VisitState } from "@/modules/visit/domain";

export type LegacyVisitOfferStatus = "pending" | "accepted" | "declined";
export type LegacyPendingInviteStatus =
  | "awaiting_approval"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "failed";

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

export interface LegacyVisitOfferRow {
  id: string;
  line_user_id: string;
  contact_id: string | null;
  status: LegacyVisitOfferStatus;
  created_at?: string;
  resolved_at?: string | null;
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

export interface LegacyVisitSnapshot {
  runId?: string;
  contact?: LegacyContactRow | null;
  offer?: LegacyVisitOfferRow | null;
  invite?: LegacyPendingInviteRow | null;
}

function optional(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

export function fromLegacyContactRow(row: LegacyContactRow): VisitContact {
  return {
    id: row.id,
    name: row.name,
    company: optional(row.company),
    title: optional(row.title),
    email: optional(row.email),
    phone: optional(row.phone),
  };
}

export function toLegacyContactInsert(contact: VisitContact, lineUserId: string) {
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
  return {
    status: outcome === "accepted" ? ("accepted" as const) : ("declined" as const),
    resolved_at: resolvedAt,
  };
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
  };
}

/**
 * Rehydrates only states that Dennis's current rows persist durably. Transient
 * provider activity (parsing, drafting, sending, calendar creation) must resume
 * through Runtime attempts rather than being guessed from a row.
 */
export function fromLegacyVisitSnapshot(snapshot: LegacyVisitSnapshot): VisitState {
  const contact = snapshot.contact ? fromLegacyContactRow(snapshot.contact) : undefined;
  const base = {
    runId: snapshot.runId,
    contact,
    offerId: snapshot.offer?.id,
    inviteId: snapshot.invite?.id,
    chosenSlot: snapshot.invite?.chosen_slot ?? undefined,
  };

  if (snapshot.invite) {
    switch (snapshot.invite.status) {
      case "awaiting_approval":
        return { ...base, status: "waiting_invite_approval" };
      case "pending":
        return { ...base, status: "waiting_contact_response" };
      case "confirmed":
        return snapshot.invite.calendar_event_id
          ? { ...base, status: "succeeded" }
          : { ...base, status: "waiting_location" };
      case "cancelled":
        return { ...base, status: "cancelled" };
      case "failed":
        return { ...base, status: "failed" };
    }
  }

  if (snapshot.offer) {
    switch (snapshot.offer.status) {
      case "pending":
        return { ...base, status: "waiting_visit_decision" };
      case "accepted":
        return { ...base, status: "preparing_invite" };
      case "declined":
        return { ...base, status: "cancelled" };
    }
  }

  return contact ? { ...base, status: "succeeded" } : { status: "idle", runId: snapshot.runId };
}
