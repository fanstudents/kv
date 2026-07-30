export interface MeetingCommandRequest {
  meetingId: string;
  command: string;
  targetSlug: string;
}

export interface MeetingAgentInput {
  slug: string;
  name: string;
  role: string;
  description: string;
}

export interface MeetingCatalogAgent extends MeetingAgentInput {
  personEn: string;
  personZh: string;
  status: string;
}

export const TEAM_LEAD_SLUG = "teamlead";

export function parseMeetingCommandRequest(payload: unknown): MeetingCommandRequest | null {
  const body =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
  const command = typeof body.command === "string" ? body.command.trim() : "";
  const targetSlug = typeof body.targetSlug === "string" ? body.targetSlug : "";

  if (!meetingId || !command) return null;
  return { meetingId, command, targetSlug };
}

export function toMeetingAgentInput(agent: MeetingCatalogAgent): MeetingAgentInput {
  return {
    slug: agent.slug,
    name: displayName(agent),
    role: agent.role,
    description: agent.description,
  };
}

export function displayName(agent: Pick<MeetingCatalogAgent, "personEn" | "personZh">): string {
  return `${agent.personEn} ${agent.personZh}`;
}

export function selectMeetingRoster(agents: readonly MeetingCatalogAgent[]) {
  return {
    teamLead: agents.find((agent) => agent.slug === TEAM_LEAD_SLUG) ?? null,
    responders: agents.filter(
      (agent) => agent.status === "active" && agent.slug !== TEAM_LEAD_SLUG
    ),
  };
}

export function findActiveMeetingAgent(
  agents: readonly MeetingCatalogAgent[],
  slug: string
): MeetingCatalogAgent | null {
  return agents.find((agent) => agent.slug === slug && agent.status === "active") ?? null;
}

export function withMeetingReplyFallback(text: string): string {
  return text || "收到，我馬上處理，稍後回報進度給您。";
}
