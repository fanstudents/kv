export interface ActivityReadError {
  message: string;
}

export interface ActivityReadPort {
  list(
    status: string | null,
    limit: number,
    agentSlug?: string | null,
  ): Promise<{ data: unknown; error: ActivityReadError | null }>;
}
