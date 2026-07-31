import type { MeetingSessionRepository } from "./session";

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

export interface RealtimeSessionMintInput {
  agentName: string;
  role: string;
  description: string;
  voice: string;
  isTeamLead: boolean;
  history: string;
  liveContext: string;
}

export interface RealtimeSessionContextProvider {
  demo(agentSlug: string): string;
  live(agentSlug: string): Promise<string>;
}

export interface RealtimeSessionProvider {
  mint(input: RealtimeSessionMintInput): Promise<unknown>;
}

export interface RealtimeSessionDependencies {
  meetingSessions: Pick<MeetingSessionRepository, "getHistory">;
  context: RealtimeSessionContextProvider;
  provider: RealtimeSessionProvider;
}

export interface MeetingRealtimeUsageLogRequest {
  model: string;
  agentSlug?: string;
  usage: unknown;
}

export interface MeetingRealtimeUsageRepository {
  record(input: MeetingRealtimeUsageLogRequest): Promise<void>;
}

export type RealtimeSessionResult =
  | { kind: "agent-not-found" }
  | { kind: "mint-failed"; message: string }
  | { kind: "ok"; session: unknown };

export type MeetingRealtimeUsageLogResult =
  | { kind: "invalid"; message: "缺少 model" }
  | { kind: "ok" };

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

/**
 * Mints the existing ephemeral realtime session. History and live-context
 * lookup are deliberately best-effort so a transient data read cannot stop a
 * meeting from starting; provider minting remains the route's error boundary.
 */
export async function runRealtimeSession(
  input: RealtimeSessionRequest,
  agent: RealtimeAgentProfile | null,
  dependencies: RealtimeSessionDependencies
): Promise<RealtimeSessionResult> {
  if (!agent) return { kind: "agent-not-found" };

  let history = "";
  if (input.meetingId) {
    try {
      history = await dependencies.meetingSessions.getHistory(input.meetingId, 8);
    } catch {
      // 脈絡取不到不影響開新的一輪。
    }
  }

  let liveContext = "";
  if (input.demo) {
    // 示範模式沿用現有行為：只餵示範資料，不碰真實資料來源。
    // 同步 provider 若自行拋錯，維持原路由的錯誤邊界。
    liveContext = dependencies.context.demo(agent.slug);
  } else {
    try {
      liveContext = await dependencies.context.live(agent.slug);
    } catch {
      // 真實資料抓不到就讓 Agent 老實說沒有資料，而不是讓整支路由失敗。
    }
  }

  try {
    const session = await dependencies.provider.mint({
      agentName: agent.name,
      role: agent.role,
      description: agent.description,
      voice: input.voice,
      isTeamLead: agent.isTeamLead,
      history,
      liveContext,
    });
    return { kind: "ok", session };
  } catch (error) {
    return {
      kind: "mint-failed",
      message: error instanceof Error ? error.message : "\u7121\u6cd5\u5efa\u7acb\u5373\u6642\u8a9e\u97f3\u9023\u7dda",
    };
  }
}

export async function runMeetingRealtimeUsageLog(
  input: MeetingRealtimeUsageLogRequest,
  repository: MeetingRealtimeUsageRepository
): Promise<MeetingRealtimeUsageLogResult> {
  if (!input.model) return { kind: "invalid", message: "缺少 model" };

  // 保留現有 route 邊界：repository 若真的拋錯，讓呼叫端維持原本未攔截的錯誤行為；
  // logRealtimeUsage 自己會吞掉實際寫入失敗。
  await repository.record(input);
  return { kind: "ok" };
}
