export type VisitLineActivityStatus = "success" | "failed" | "pending";

export interface VisitLineActivityRecord {
  agent_slug?: string | null;
  summary: string;
  status: VisitLineActivityStatus;
}

export interface VisitLineActivityPort {
  record(activity: VisitLineActivityRecord): Promise<void>;
}
