import type { AgentStatusRow } from "./status-rules";

export interface AgentStatusReadPort {
  list(): Promise<{
    data: AgentStatusRow[] | null;
    error: unknown;
  }>;
}
