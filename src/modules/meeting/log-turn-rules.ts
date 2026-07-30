export type MeetingTurnRole = "boss" | "agent" | "teamlead";

export interface MeetingTurnLogRequest {
  meetingId: string;
  role: MeetingTurnRole;
  content: string;
  agentSlug?: string;
  speaker?: string;
}

export function parseMeetingTurnLogRequest(payload: unknown): MeetingTurnLogRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    meetingId: typeof body.meetingId === "string" ? body.meetingId : "",
    role: body.role === "agent" || body.role === "teamlead" ? body.role : "boss",
    content: typeof body.content === "string" ? body.content.trim() : "",
    agentSlug: typeof body.agentSlug === "string" ? body.agentSlug : undefined,
    speaker: typeof body.speaker === "string" ? body.speaker : undefined,
  };
}
