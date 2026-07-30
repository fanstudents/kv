import type { LiveTaskReadPort } from "./read-ports";
import type { LiveTaskReadRequest, LiveTaskReadStatus } from "./read-rules";

export type LiveTaskReadResult =
  | { kind: "inactive" }
  | {
      kind: "active";
      response: {
        active: true;
        nodeId: string | null;
        runId: string | null;
        step: number;
        status: LiveTaskReadStatus;
        caption: string | null;
        hasImage: boolean;
        imageVersion: number;
        updatedAt: number;
      };
    };

function normalizeStepStatus(status: string): LiveTaskReadStatus {
  return status === "waiting" ? "waiting" : status === "done" ? "done" : "active";
}

export async function runLiveTaskRead(
  input: LiveTaskReadRequest,
  port: LiveTaskReadPort,
): Promise<LiveTaskReadResult> {
  const [task, step] = await Promise.all([
    port.getTaskState(input.agentSlug),
    port.getCurrentStep(input.agentSlug),
  ]);
  if (!task && !step) return { kind: "inactive" };

  const status = step ? normalizeStepStatus(step.status) : task?.status;
  return {
    kind: "active",
    response: {
      active: true,
      nodeId: step?.nodeId ?? null,
      runId: step?.runId ?? null,
      step: task?.step ?? 0,
      status: status ?? "active",
      caption: step?.outputSummary ?? task?.caption ?? null,
      hasImage: task?.hasImage ?? false,
      imageVersion: task?.imageVersion ?? 0,
      updatedAt: task?.updatedAt ?? (step ? Date.parse(step.startedAt) : Date.now()),
    },
  };
}
