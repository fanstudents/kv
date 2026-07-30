export interface MeetingRealtimeUsageLogRequest {
  model: string;
  agentSlug?: string;
  usage: unknown;
}

export function parseMeetingRealtimeUsageLogRequest(
  payload: unknown
): MeetingRealtimeUsageLogRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    model: typeof body.model === "string" ? body.model : "",
    agentSlug: typeof body.agentSlug === "string" ? body.agentSlug : undefined,
    usage: body.usage && typeof body.usage === "object" ? body.usage : {},
  };
}
