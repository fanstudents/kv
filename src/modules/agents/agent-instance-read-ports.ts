export interface AgentInstanceRecord {
  [key: string]: unknown;
}

export interface AgentInstanceReadPort {
  getBySlug(slug: string): Promise<{
    data: AgentInstanceRecord | null;
    errorMessage: string | null;
  }>;
}
