export interface VisitContact {
  id?: string;
  name: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
}

export type VisitStatus =
  | "idle"
  | "parsing_card"
  | "waiting_visit_decision"
  | "preparing_invite"
  | "waiting_invite_approval"
  | "delivering_invite"
  | "waiting_contact_response"
  | "waiting_location"
  | "fulfilling_visit"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface VisitState {
  status: VisitStatus;
  runId?: string;
  contact?: VisitContact;
  offerId?: string;
  inviteId?: string;
  chosenSlot?: "1" | "2" | "both";
  error?: string;
}

export type VisitEvent =
  | { type: "card.received"; runId: string; messageId: string }
  | { type: "card.unrecognized"; reason: string }
  | { type: "card.parsed"; contact: VisitContact; offerId?: string }
  | { type: "contact.corrected"; field: keyof Omit<VisitContact, "id">; value: string }
  | { type: "visit.declined" }
  | { type: "visit.confirmed" }
  | { type: "offer.timed_out" }
  | { type: "invite.prepared"; inviteId: string; requiresApproval: boolean }
  | { type: "invite.revised" }
  | { type: "invite.approved" }
  | { type: "invite.cancelled" }
  | { type: "invite.delivered" }
  | { type: "invite.delivery_failed"; error: string }
  | { type: "contact.slot_selected"; choice: "1" | "2" | "both" }
  | { type: "contact.location_submitted" }
  | { type: "visit.fulfilled" }
  | { type: "visit.fulfilment_failed"; error: string };

export type VisitIntent =
  | { type: "image.fetch-and-parse"; messageId: string }
  | { type: "contact.persist"; contact: VisitContact }
  | { type: "contact.update"; field: keyof Omit<VisitContact, "id">; value: string }
  | { type: "offer.persist"; offerId: string }
  | { type: "offer.resolve"; outcome: "accepted" | "declined" | "timed_out" }
  | { type: "invite.prepare" }
  | { type: "invite.persist"; inviteId: string; status: "awaiting_approval" | "pending" }
  | { type: "invite.revise" }
  | { type: "invite.deliver"; idempotencyKey: string }
  | { type: "invite.mark"; status: "pending" | "confirmed" | "cancelled" | "failed" }
  | { type: "visit.fulfil"; idempotencyKey: string }
  | { type: "operator.reply"; message: string }
  | { type: "conversation.release" }
  | { type: "artifact.save"; kind: "invite-email" }
  | { type: "contact.research.defer" };

export interface VisitDecision {
  state: VisitState;
  intents: VisitIntent[];
}

export class InvalidVisitTransitionError extends Error {}

function invalid(state: VisitState, event: VisitEvent): never {
  throw new InvalidVisitTransitionError(`Visit cannot apply ${event.type} while ${state.status}`);
}

function validEmail(contact: VisitContact | undefined): boolean {
  return Boolean(contact?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email));
}

export function reduceVisit(state: VisitState, event: VisitEvent): VisitDecision {
  switch (event.type) {
    case "card.received":
      if (state.status !== "idle") return invalid(state, event);
      return {
        state: { status: "parsing_card", runId: event.runId },
        intents: [{ type: "image.fetch-and-parse", messageId: event.messageId }],
      };
    case "card.unrecognized":
      if (state.status !== "parsing_card") return invalid(state, event);
      return {
        state: { ...state, status: "failed", error: event.reason },
        intents: [
          { type: "operator.reply", message: "card-unrecognized" },
          { type: "conversation.release" },
        ],
      };
    case "card.parsed": {
      if (state.status !== "parsing_card") return invalid(state, event);
      const intents: VisitIntent[] = [{ type: "contact.persist", contact: event.contact }];
      if (!validEmail(event.contact) || !event.offerId) {
        return {
          state: { ...state, status: "succeeded", contact: event.contact },
          intents: [
            ...intents,
            { type: "operator.reply", message: "contact-saved-without-invite" },
            { type: "conversation.release" },
          ],
        };
      }
      return {
        state: {
          ...state,
          status: "waiting_visit_decision",
          contact: event.contact,
          offerId: event.offerId,
        },
        intents: [
          ...intents,
          { type: "offer.persist", offerId: event.offerId },
          { type: "operator.reply", message: "confirm-visit" },
        ],
      };
    }
    case "contact.corrected":
      if (state.status !== "waiting_visit_decision" || !state.contact) return invalid(state, event);
      return {
        state: { ...state, contact: { ...state.contact, [event.field]: event.value } },
        intents: [
          { type: "contact.update", field: event.field, value: event.value },
          { type: "operator.reply", message: "contact-corrected" },
        ],
      };
    case "visit.declined":
    case "offer.timed_out":
      if (state.status !== "waiting_visit_decision") return invalid(state, event);
      return {
        state: { ...state, status: "cancelled" },
        intents: [
          { type: "offer.resolve", outcome: event.type === "visit.declined" ? "declined" : "timed_out" },
          { type: "operator.reply", message: event.type },
          { type: "conversation.release" },
        ],
      };
    case "visit.confirmed":
      if (state.status !== "waiting_visit_decision") return invalid(state, event);
      if (!validEmail(state.contact)) {
        return { state, intents: [{ type: "operator.reply", message: "invalid-email" }] };
      }
      return {
        state: { ...state, status: "preparing_invite" },
        intents: [{ type: "offer.resolve", outcome: "accepted" }, { type: "invite.prepare" }],
      };
    case "invite.prepared":
      if (state.status !== "preparing_invite") return invalid(state, event);
      return event.requiresApproval
        ? {
            state: { ...state, status: "waiting_invite_approval", inviteId: event.inviteId },
            intents: [
              { type: "invite.persist", inviteId: event.inviteId, status: "awaiting_approval" },
              { type: "operator.reply", message: "review-invite" },
            ],
          }
        : {
            state: { ...state, status: "delivering_invite", inviteId: event.inviteId },
            intents: [
              { type: "invite.persist", inviteId: event.inviteId, status: "pending" },
              { type: "invite.deliver", idempotencyKey: `visit:${event.inviteId}:deliver` },
            ],
          };
    case "invite.revised":
      if (state.status !== "waiting_invite_approval") return invalid(state, event);
      return { state, intents: [{ type: "invite.revise" }, { type: "operator.reply", message: "review-invite" }] };
    case "invite.approved":
      if (state.status !== "waiting_invite_approval" || !state.inviteId) return invalid(state, event);
      return {
        state: { ...state, status: "delivering_invite" },
        intents: [{ type: "invite.deliver", idempotencyKey: `visit:${state.inviteId}:deliver` }],
      };
    case "invite.cancelled":
      if (state.status !== "waiting_invite_approval") return invalid(state, event);
      return {
        state: { ...state, status: "cancelled" },
        intents: [
          { type: "invite.mark", status: "cancelled" },
          { type: "operator.reply", message: "invite-cancelled" },
          { type: "conversation.release" },
        ],
      };
    case "invite.delivered":
      if (state.status !== "delivering_invite") return invalid(state, event);
      return {
        state: { ...state, status: "waiting_contact_response" },
        intents: [
          { type: "invite.mark", status: "pending" },
          { type: "artifact.save", kind: "invite-email" },
          { type: "operator.reply", message: "invite-delivered" },
          { type: "conversation.release" },
        ],
      };
    case "invite.delivery_failed":
      if (state.status !== "delivering_invite") return invalid(state, event);
      return {
        state: { ...state, status: "failed", error: event.error },
        intents: [
          { type: "invite.mark", status: "failed" },
          { type: "operator.reply", message: "invite-delivery-failed" },
          { type: "conversation.release" },
        ],
      };
    case "contact.slot_selected":
      if (state.status !== "waiting_contact_response") return invalid(state, event);
      return {
        state: { ...state, status: "waiting_location", chosenSlot: event.choice },
        intents: [{ type: "invite.mark", status: "confirmed" }],
      };
    case "contact.location_submitted":
      if (state.status !== "waiting_location" || !state.inviteId) return invalid(state, event);
      return {
        state: { ...state, status: "fulfilling_visit" },
        intents: [{ type: "visit.fulfil", idempotencyKey: `visit:${state.inviteId}:fulfil` }],
      };
    case "visit.fulfilled":
      if (state.status !== "fulfilling_visit") return invalid(state, event);
      return {
        state: { ...state, status: "succeeded" },
        intents: [
          { type: "operator.reply", message: "visit-fulfilled" },
          { type: "contact.research.defer" },
        ],
      };
    case "visit.fulfilment_failed":
      if (state.status !== "fulfilling_visit") return invalid(state, event);
      return {
        state: { ...state, status: "failed", error: event.error },
        intents: [
          { type: "invite.mark", status: "failed" },
          { type: "operator.reply", message: "visit-fulfilment-failed" },
        ],
      };
  }
}
