import type { VisitEvent, VisitStatus } from "@/modules/visit/domain";
import type { VisitLegacyLiveProjection } from "@/modules/visit/projection";

export interface VisitParityScenario {
  id: string;
  legacyEvidence: string[];
  events: VisitEvent[];
  expectedStatuses: VisitStatus[];
  expectedIntentTypes: string[][];
  expectedLegacyProjections: Array<VisitLegacyLiveProjection | null>;
}

const contact = {
  id: "contact-1",
  name: "Dennis",
  company: "CabLate",
  email: "dennis@example.test",
};

export const VISIT_PARITY_SCENARIOS: VisitParityScenario[] = [
  {
    id: "unrecognized-card",
    legacyEvidence: [
      "src/app/api/line/webhook/route.ts:69",
      "src/app/api/line/webhook/route.ts:71",
      "src/app/api/line/webhook/route.ts:105",
    ],
    events: [
      { type: "card.received", runId: "run-1", messageId: "message-1" },
      { type: "card.unrecognized", reason: "no contact fields" },
    ],
    expectedStatuses: ["parsing_card", "failed"],
    expectedIntentTypes: [
      ["image.fetch-and-parse"],
      ["operator.reply", "conversation.release"],
    ],
    expectedLegacyProjections: [
      { nodeId: "scan", step: 0, status: "active" },
      { nodeId: "scan", step: 0, status: "active" },
    ],
  },
  {
    id: "contact-without-invite",
    legacyEvidence: [
      "src/app/api/line/webhook/route.ts:114",
      "src/app/api/line/webhook/route.ts:122",
      "src/app/api/line/webhook/route.ts:319",
    ],
    events: [
      { type: "card.received", runId: "run-2", messageId: "message-2" },
      { type: "card.parsed", contact: { name: "No Email" } },
    ],
    expectedStatuses: ["parsing_card", "succeeded"],
    expectedIntentTypes: [
      ["image.fetch-and-parse"],
      ["contact.persist", "operator.reply", "conversation.release"],
    ],
    expectedLegacyProjections: [
      { nodeId: "scan", step: 0, status: "active" },
      { nodeId: "confirm", step: 2, status: "waiting" },
    ],
  },
  {
    id: "operator-declines-visit",
    legacyEvidence: [
      "src/app/api/line/webhook/route.ts:268",
      "src/app/api/line/webhook/route.ts:273",
      "src/app/api/line/webhook/route.ts:281",
    ],
    events: [
      { type: "card.received", runId: "run-3", messageId: "message-3" },
      { type: "card.parsed", contact, offerId: "offer-3" },
      { type: "visit.declined" },
    ],
    expectedStatuses: ["parsing_card", "waiting_visit_decision", "cancelled"],
    expectedIntentTypes: [
      ["image.fetch-and-parse"],
      ["contact.persist", "offer.persist", "operator.reply"],
      ["offer.resolve", "operator.reply", "conversation.release"],
    ],
    expectedLegacyProjections: [
      { nodeId: "scan", step: 0, status: "active" },
      { nodeId: "confirm", step: 2, status: "waiting" },
      { nodeId: "tag", step: 2, status: "done" },
    ],
  },
  {
    id: "direct-invite-delivery",
    legacyEvidence: [
      "src/app/api/line/webhook/route.ts:333",
      "src/app/api/line/webhook/route.ts:424",
      "src/app/api/line/webhook/route.ts:438",
    ],
    events: [
      { type: "card.received", runId: "run-4", messageId: "message-4" },
      { type: "card.parsed", contact, offerId: "offer-4" },
      { type: "visit.confirmed" },
      { type: "invite.prepared", inviteId: "invite-4", requiresApproval: false },
      { type: "invite.delivered" },
    ],
    expectedStatuses: [
      "parsing_card",
      "waiting_visit_decision",
      "preparing_invite",
      "delivering_invite",
      "waiting_contact_response",
    ],
    expectedIntentTypes: [
      ["image.fetch-and-parse"],
      ["contact.persist", "offer.persist", "operator.reply"],
      ["offer.resolve", "invite.prepare"],
      ["invite.persist", "invite.deliver"],
      ["invite.mark", "artifact.save", "operator.reply", "conversation.release"],
    ],
    expectedLegacyProjections: [
      { nodeId: "scan", step: 0, status: "active" },
      { nodeId: "confirm", step: 2, status: "waiting" },
      { nodeId: "match", step: 2, status: "active" },
      { nodeId: "draft", step: 3, status: "active" },
      { nodeId: "sent", step: 4, status: "done" },
    ],
  },
  {
    id: "approval-then-fulfilment-failure",
    legacyEvidence: [
      "src/app/api/line/webhook/route.ts:394",
      "src/app/api/line/webhook/route.ts:513",
      "src/app/api/line/webhook/route.ts:528",
      "src/app/api/agents/visit/respond/route.ts",
    ],
    events: [
      { type: "card.received", runId: "run-5", messageId: "message-5" },
      { type: "card.parsed", contact, offerId: "offer-5" },
      { type: "visit.confirmed" },
      { type: "invite.prepared", inviteId: "invite-5", requiresApproval: true },
      { type: "invite.revised" },
      { type: "invite.approved" },
      { type: "invite.delivered" },
      { type: "contact.slot_selected", choice: "both" },
      { type: "contact.location_submitted" },
      { type: "visit.fulfilment_failed", error: "calendar rejected" },
    ],
    expectedStatuses: [
      "parsing_card",
      "waiting_visit_decision",
      "preparing_invite",
      "waiting_invite_approval",
      "waiting_invite_approval",
      "delivering_invite",
      "waiting_contact_response",
      "waiting_location",
      "fulfilling_visit",
      "failed",
    ],
    expectedIntentTypes: [
      ["image.fetch-and-parse"],
      ["contact.persist", "offer.persist", "operator.reply"],
      ["offer.resolve", "invite.prepare"],
      ["invite.persist", "operator.reply"],
      ["invite.revise", "operator.reply"],
      ["invite.deliver"],
      ["invite.mark", "artifact.save", "operator.reply", "conversation.release"],
      ["invite.mark"],
      ["visit.fulfil"],
      ["invite.mark", "operator.reply"],
    ],
    expectedLegacyProjections: [
      { nodeId: "scan", step: 0, status: "active" },
      { nodeId: "confirm", step: 2, status: "waiting" },
      { nodeId: "match", step: 2, status: "active" },
      { nodeId: "draft", step: 3, status: "active" },
      { nodeId: "draft", step: 3, status: "active" },
      { nodeId: "draft", step: 3, status: "active" },
      { nodeId: "sent", step: 4, status: "done" },
      { nodeId: "sent", step: 4, status: "done" },
      { nodeId: "sent", step: 4, status: "done" },
      { nodeId: "sent", step: 4, status: "done" },
    ],
  },
];
