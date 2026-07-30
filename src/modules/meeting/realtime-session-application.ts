import type { RealtimeSessionPorts } from "./realtime-session-ports";
import type { RealtimeAgentProfile, RealtimeSessionRequest } from "./realtime-session-rules";

export type RealtimeSessionResult =
  | { kind: "agent-not-found" }
  | { kind: "mint-failed"; message: string }
  | { kind: "ok"; session: unknown };

/**
 * Runs the existing realtime-session orchestration while keeping provider and
 * legacy-storage details behind ports. The empty-context fallbacks are part of
 * the current route contract: history/live context failures must not prevent a
 * new session from being minted.
 */
export async function runRealtimeSession(
  input: RealtimeSessionRequest,
  agent: RealtimeAgentProfile | null,
  ports: RealtimeSessionPorts
): Promise<RealtimeSessionResult> {
  if (!agent) return { kind: "agent-not-found" };

  let history = "";
  if (input.meetingId) {
    try {
      history = await ports.history.load(input.meetingId, 8);
    } catch {
      // 脈絡取不到不影響開新的一輪
    }
  }

  // 示範模式沿用現有行為：只餵示範資料，不碰真實資料來源。
  // 這個同步 provider 若自行拋錯，維持原路由的錯誤邊界。
  let liveContext = "";
  if (input.demo) {
    liveContext = ports.context.demo(agent.slug);
  } else {
    try {
      liveContext = await ports.context.live(agent.slug);
    } catch {
      // 真實資料抓不到就讓 Agent 老實說沒有資料，而不是讓整支路由失敗
    }
  }

  try {
    const session = await ports.provider.mint({
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
      message: error instanceof Error ? error.message : "無法建立即時語音連線",
    };
  }
}
