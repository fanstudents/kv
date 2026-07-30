import type { RunRecord, RunState, RunTransition } from "@/platform/runtime/contracts";

const ALLOWED_TRANSITIONS: Record<RunState, readonly RunState[]> = {
  queued: ["running", "cancelled"],
  running: ["waiting_input", "waiting_approval", "retrying", "succeeded", "failed", "cancelled"],
  waiting_input: ["running", "failed", "cancelled"],
  waiting_approval: ["running", "failed", "cancelled"],
  retrying: ["running", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export class InvalidRunTransitionError extends Error {}
export class StaleRunVersionError extends Error {}

export function canTransition(from: RunState, to: RunState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionRun(run: RunRecord, transition: RunTransition): RunRecord {
  if (run.stateVersion !== transition.expectedVersion) {
    throw new StaleRunVersionError(
      `Run ${run.id} expected version ${transition.expectedVersion}, current version is ${run.stateVersion}`
    );
  }
  if (!canTransition(run.state, transition.to)) {
    throw new InvalidRunTransitionError(`Run ${run.id} cannot transition from ${run.state} to ${transition.to}`);
  }

  return {
    ...run,
    state: transition.to,
    stateVersion: run.stateVersion + 1,
    updatedAt: transition.at,
    lease: undefined,
    output: transition.output ?? run.output,
    error: transition.error,
  };
}
