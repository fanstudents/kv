export interface LiveTaskReadRequest {
  agentSlug: string;
}

export type LiveTaskReadStatus = "active" | "waiting" | "done";

export interface LiveTaskStateSnapshot {
  step: number;
  status: LiveTaskReadStatus;
  caption: string | null;
  hasImage: boolean;
  imageVersion: number;
  updatedAt: number;
}

export interface LiveTaskStepSnapshot {
  runId: string;
  nodeId: string;
  status: string;
  outputSummary: string | null;
  startedAt: string;
}

export function parseLiveTaskReadRequest(agent: unknown): LiveTaskReadRequest {
  return { agentSlug: typeof agent === "string" ? agent : "" };
}
