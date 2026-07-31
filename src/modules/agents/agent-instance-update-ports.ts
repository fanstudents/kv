import type { AgentInstanceRecord } from "./agent-instance-read-ports";

export interface AgentInstanceActivityInput {
  agent_slug: string;
  summary: string;
  status: "failed" | "success";
}

export interface AgentInstanceUpdatePort {
  updateBySlug(slug: string, update: Record<string, unknown>): Promise<{
    data: AgentInstanceRecord | null;
    errorMessage: string | null;
  }>;
  recordActivity(activity: AgentInstanceActivityInput): Promise<void>;
}
