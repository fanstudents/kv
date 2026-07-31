import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { createMeetingRealtimeContextProvider } from "@/adapters/meeting/meeting-realtime-context-provider";
import { createMeetingSessionRepository } from "@/adapters/meeting/meeting-session-repository";
import { createOpenAiMeetingRealtimeProvider } from "@/adapters/meeting/openai-meeting-realtime-provider";
import {
  findActiveRealtimeAgent,
  parseRealtimeSessionRequest,
  runRealtimeSession,
  toRealtimeAgentProfile,
} from "@/modules/meeting/realtime";

// 開一場即時語音對談（WebRTC）：幫指定 Agent 的人設向 OpenAI 換一組短效期
// ephemeral token，瀏覽器直接用這組 token 跟 OpenAI 建立語音連線，正式的
// OPENAI_API_KEY 永遠不會離開伺服器。每次切換對談對象（換人／點名）都會
// 重新呼叫這支路由換一個新 token。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseRealtimeSessionRequest(body);
  const agent = findActiveRealtimeAgent(AGENTS, input.slug);
  const profile = agent ? toRealtimeAgentProfile(agent) : null;
  const result = await runRealtimeSession(input, profile, {
    meetingSessions: createMeetingSessionRepository(),
    context: createMeetingRealtimeContextProvider(),
    provider: createOpenAiMeetingRealtimeProvider(),
  });

  if (result.kind === "agent-not-found") {
    return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });
  }
  if (result.kind === "mint-failed") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  return NextResponse.json(result.session);
}
