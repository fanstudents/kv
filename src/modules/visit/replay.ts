import {
  reduceVisit,
  type VisitDecision,
  type VisitEvent,
  type VisitState,
} from "@/modules/visit/domain";
import {
  projectVisitLegacyLiveTask,
  type VisitLegacyLiveProjection,
} from "@/modules/visit/projection";

export interface VisitReplayFrame {
  event: VisitEvent;
  decision: VisitDecision;
  legacyProjection: VisitLegacyLiveProjection | null;
}

export interface VisitReplay {
  initialState: VisitState;
  frames: VisitReplayFrame[];
  finalState: VisitState;
}

/**
 * Deterministically replays captured adapter inputs without executing intents.
 * This is the seam used by fixtures now and by a future read-only shadow runner.
 */
export function replayVisit(
  initialState: VisitState,
  events: readonly VisitEvent[]
): VisitReplay {
  const frames: VisitReplayFrame[] = [];
  let state = initialState;

  for (const event of events) {
    const decision = reduceVisit(state, event);
    frames.push({
      event,
      decision,
      legacyProjection: projectVisitLegacyLiveTask(decision.state),
    });
    state = decision.state;
  }

  return { initialState, frames, finalState: state };
}
