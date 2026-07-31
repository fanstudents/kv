export interface ActivityReadRequest {
  status: string | null;
  limit: number;
}

export function parseActivityReadRequest(status: unknown, limit: unknown): ActivityReadRequest {
  return {
    status: typeof status === "string" ? status : null,
    limit: Number(limit ?? "200"),
  };
}
