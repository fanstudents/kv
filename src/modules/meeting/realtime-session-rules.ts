export interface RealtimeSessionRequest {
  slug: string;
  meetingId: string;
  voice: string;
  demo: boolean;
}

export interface RealtimeCatalogAgent {
  slug: string;
  personEn: string;
  personZh: string;
  role: string;
  description: string;
  status: string;
}

export interface RealtimeAgentProfile {
  slug: string;
  name: string;
  role: string;
  description: string;
  isTeamLead: boolean;
}

export const REALTIME_TEAM_LEAD_SLUG = "teamlead";

export function parseRealtimeSessionRequest(payload: unknown): RealtimeSessionRequest {
  const body =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  return {
    slug: typeof body.slug === "string" ? body.slug : "",
    meetingId: typeof body.meetingId === "string" ? body.meetingId : "",
    voice: typeof body.voice === "string" ? body.voice : "alloy",
    demo: body.demo === true,
  };
}

export function findActiveRealtimeAgent(
  agents: readonly RealtimeCatalogAgent[],
  slug: string
): RealtimeCatalogAgent | null {
  return agents.find((agent) => agent.slug === slug && agent.status === "active") ?? null;
}

export function toRealtimeAgentProfile(agent: RealtimeCatalogAgent): RealtimeAgentProfile {
  return {
    slug: agent.slug,
    name: `${agent.personEn} ${agent.personZh}`,
    role: agent.role,
    description: agent.description,
    isTeamLead: agent.slug === REALTIME_TEAM_LEAD_SLUG,
  };
}
