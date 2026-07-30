import { describe, expect, it } from "vitest";
import { InvalidVisitTransitionError, reduceVisit, type VisitEvent, type VisitState } from "@/modules/visit/domain";
import { VISIT_WORKFLOW } from "@/modules/visit/workflow";

function apply(state: VisitState, ...events: VisitEvent[]): VisitState {
  return events.reduce((current, event) => reduceVisit(current, event).state, state);
}

const idle: VisitState = { status: "idle" };
const contact = { id: "contact-1", name: "Dennis", email: "dennis@example.test", company: "CabLate" };

describe("Coco Visit domain", () => {
  it("defines a validated branch-capable workflow", () => {
    expect(VISIT_WORKFLOW).toMatchObject({ id: "visit", version: 1, entryNodeId: "parse-card" });
  });

  it("keeps a correction in the operator decision state", () => {
    const waiting = apply(
      idle,
      { type: "card.received", runId: "run-1", messageId: "message-1" },
      { type: "card.parsed", contact, offerId: "offer-1" }
    );
    const decision = reduceVisit(waiting, { type: "contact.corrected", field: "company", value: "CabLate AI" });

    expect(decision.state).toMatchObject({
      status: "waiting_visit_decision",
      contact: { company: "CabLate AI" },
    });
    expect(decision.intents.map((intent) => intent.type)).toEqual(["contact.update", "operator.reply"]);
  });

  it("completes the approval-required happy path with stable delivery and fulfilment keys", () => {
    let state = apply(
      idle,
      { type: "card.received", runId: "run-1", messageId: "message-1" },
      { type: "card.parsed", contact, offerId: "offer-1" },
      { type: "visit.confirmed" }
    );
    state = reduceVisit(state, { type: "invite.prepared", inviteId: "invite-1", requiresApproval: true }).state;
    const approved = reduceVisit(state, { type: "invite.approved" });
    expect(approved.intents).toContainEqual({
      type: "invite.deliver",
      idempotencyKey: "visit:invite-1:deliver",
    });
    state = apply(
      approved.state,
      { type: "invite.delivered" },
      { type: "contact.slot_selected", choice: "1" }
    );
    const fulfil = reduceVisit(state, { type: "contact.location_submitted" });
    expect(fulfil.intents).toEqual([
      { type: "visit.fulfil", idempotencyKey: "visit:invite-1:fulfil" },
    ]);
    expect(reduceVisit(fulfil.state, { type: "visit.fulfilled" }).state.status).toBe("succeeded");
  });

  it("skips approval only when the prepared event says so", () => {
    const preparing = apply(
      idle,
      { type: "card.received", runId: "run-1", messageId: "message-1" },
      { type: "card.parsed", contact, offerId: "offer-1" },
      { type: "visit.confirmed" }
    );
    const decision = reduceVisit(preparing, {
      type: "invite.prepared",
      inviteId: "invite-2",
      requiresApproval: false,
    });

    expect(decision.state.status).toBe("delivering_invite");
    expect(decision.intents).toContainEqual({
      type: "invite.deliver",
      idempotencyKey: "visit:invite-2:deliver",
    });
  });

  it("models no-email, decline, timeout, delivery failure, and fulfilment failure explicitly", () => {
    const parsing = apply(idle, { type: "card.received", runId: "run-1", messageId: "message-1" });
    expect(
      reduceVisit(parsing, { type: "card.parsed", contact: { name: "No Email" } }).state.status
    ).toBe("succeeded");

    const waiting = reduceVisit(parsing, { type: "card.parsed", contact, offerId: "offer-1" }).state;
    expect(reduceVisit(waiting, { type: "visit.declined" }).state.status).toBe("cancelled");
    expect(reduceVisit(waiting, { type: "offer.timed_out" }).state.status).toBe("cancelled");

    const preparing = reduceVisit(waiting, { type: "visit.confirmed" }).state;
    const delivering = reduceVisit(preparing, {
      type: "invite.prepared",
      inviteId: "invite-1",
      requiresApproval: false,
    }).state;
    expect(reduceVisit(delivering, { type: "invite.delivery_failed", error: "gmail timeout" }).state).toMatchObject({
      status: "failed",
      error: "gmail timeout",
    });

    const fulfilling = apply(
      delivering,
      { type: "invite.delivered" },
      { type: "contact.slot_selected", choice: "both" },
      { type: "contact.location_submitted" }
    );
    expect(reduceVisit(fulfilling, { type: "visit.fulfilment_failed", error: "calendar timeout" }).state).toMatchObject({
      status: "failed",
      error: "calendar timeout",
    });
  });

  it("rejects events from the wrong state", () => {
    expect(() => reduceVisit(idle, { type: "invite.approved" })).toThrow(InvalidVisitTransitionError);
  });
});
