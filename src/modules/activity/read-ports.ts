export interface ActivityReadError {
  message: string;
}

export interface ActivityReadPort {
  list(
    status: string | null,
    limit: number,
  ): Promise<{ data: unknown; error: ActivityReadError | null }>;
}
