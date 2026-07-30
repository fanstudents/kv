export interface MeetingStartRequest {
  title?: string;
}

export function parseMeetingStartRequest(payload: unknown): MeetingStartRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return { title: typeof body.title === "string" ? body.title : undefined };
}
