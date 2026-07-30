export interface SupportLogReplyRequest {
  userId: string;
  text: string;
}

export function parseSupportLogReplyRequest(payload: unknown): SupportLogReplyRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    userId: typeof body.userId === "string" ? body.userId : "",
    text: typeof body.text === "string" ? body.text : "",
  };
}
