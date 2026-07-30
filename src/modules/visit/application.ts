import { reduceVisit, type VisitDecision, type VisitEvent, type VisitState } from "@/modules/visit/domain";
import {
  executeVisitIntents,
  type VisitIntentReceipt,
} from "@/modules/visit/intent-executor";
import {
  projectVisitLegacyLiveTask,
  type VisitLegacyLiveProjection,
} from "@/modules/visit/projection";

export interface VisitEventEvaluation {
  eventId: string;
  previousState: VisitState;
  decision: VisitDecision;
  legacyProjection: VisitLegacyLiveProjection | null;
  intentPlan: VisitIntentReceipt[];
}

/**
 * Evaluates one event without invoking persistence or providers. This is safe
 * for fixtures and shadow mode; production execution remains a separate owner.
 */
export async function evaluateVisitEvent(params: {
  state: VisitState;
  event: VisitEvent;
  eventId: string;
  runId?: string;
}): Promise<VisitEventEvaluation> {
  const decision = reduceVisit(params.state, params.event);
  const intentPlan = await executeVisitIntents(
    decision.intents,
    {
      state: decision.state,
      eventId: params.eventId,
      runId: params.runId ?? decision.state.runId,
    },
    { mode: "record-only" }
  );

  return {
    eventId: params.eventId,
    previousState: params.state,
    decision,
    legacyProjection: projectVisitLegacyLiveTask(decision.state),
    intentPlan,
  };
}
