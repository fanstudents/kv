import type { VisitState } from "@/modules/visit/domain";

export type VisitLegacyNodeId = "scan" | "confirm" | "match" | "tag" | "draft" | "sent";
export type VisitLegacyStep = 0 | 2 | 3 | 4;
export type VisitLegacyStatus = "active" | "waiting" | "done";

export interface VisitLegacyLiveProjection {
  nodeId: VisitLegacyNodeId;
  step: VisitLegacyStep;
  status: VisitLegacyStatus;
}

const SCANNING = { nodeId: "scan", step: 0, status: "active" } as const;
const CONFIRMING = { nodeId: "confirm", step: 2, status: "waiting" } as const;
const MATCHING = { nodeId: "match", step: 2, status: "active" } as const;
const TAGGED = { nodeId: "tag", step: 2, status: "done" } as const;
const DRAFTING = { nodeId: "draft", step: 3, status: "active" } as const;
const SENT = { nodeId: "sent", step: 4, status: "done" } as const;

/**
 * Projects the new Visit domain truth onto Dennis's existing live-task protocol.
 *
 * Some terminal domain states deliberately retain the last legacy node because
 * `endVisitRun` never updated `agent_live_task`. These are compatibility rules,
 * not the canonical meaning of the new workflow state.
 */
export function projectVisitLegacyLiveTask(
  state: VisitState
): VisitLegacyLiveProjection | null {
  switch (state.status) {
    case "idle":
      return null;
    case "parsing_card":
      return SCANNING;
    case "waiting_visit_decision":
      return CONFIRMING;
    case "preparing_invite":
      return MATCHING;
    case "waiting_invite_approval":
    case "delivering_invite":
      return DRAFTING;
    case "waiting_contact_response":
    case "waiting_location":
    case "fulfilling_visit":
      return SENT;
    case "cancelled":
      return state.inviteId ? DRAFTING : TAGGED;
    case "succeeded":
      return state.inviteId ? SENT : CONFIRMING;
    case "failed":
      if (state.chosenSlot) return SENT;
      if (state.inviteId) return DRAFTING;
      return SCANNING;
  }
}
