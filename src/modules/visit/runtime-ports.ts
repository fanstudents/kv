export type VisitRuntimeLiveStatus = "active" | "waiting" | "done";
export type VisitRuntimeRunStatus = "success" | "cancelled" | "failed";

export interface VisitRuntimePort {
  startVisitRun(params: { userId: string; messageId: string; summary?: string }): Promise<string | null>;
  reportVisitStep(params: {
    userId?: string;
    runId?: string | null;
    nodeId: string;
    step: number;
    status: VisitRuntimeLiveStatus;
    caption?: string;
    image?: string;
    detail?: string;
    seq?: number;
  }): Promise<void>;
  endVisitRun(params: {
    userId: string;
    status: VisitRuntimeRunStatus;
    summary: string;
    errorDetail?: string;
  }): Promise<void>;
  saveVisitArtifact(params: {
    userId: string;
    title: string;
    content: string;
    kind?: "mail" | "message" | "calendar";
    meta?: Record<string, unknown>;
  }): Promise<void>;
}
