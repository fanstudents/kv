import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { createLegacyRealtimeSessionAdapter } from "@/adapters/meeting/legacy-realtime-session-adapter";
import {
  findActiveRealtimeAgent,
  parseRealtimeSessionRequest,
  toRealtimeAgentProfile,
} from "@/modules/meeting/realtime-session-rules";

// 開一場即時語音對談（WebRTC）：幫指定 Agent 的人設向 OpenAI 換一組短效期
// ephemeral token，瀏覽器直接用這組 token 跟 OpenAI 建立語音連線，正式的
// OPENAI_API_KEY 永遠不會離開伺服器。每次切換對談對象（換人／點名）都會
// 重新呼叫這支路由換一個新 token。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseRealtimeSessionRequest(body);
  const ports = createLegacyRealtimeSessionAdapter();

  const agent = findActiveRealtimeAgent(AGENTS, input.slug);
  if (!agent) return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });

  let history = "";
  if (input.meetingId) {
    try {
      history = await ports.history.load(input.meetingId, 8);
    } catch {
      // 脈絡取不到不影響開新的一輪
    }
  }

  // 示範模式：改餵一份寫死的業務現況，而且完全不去抓真實資料——
  // 上台展示時 Agent 才有具體的名字與數字可以講，也不會不小心念出真實客戶資料。
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
    const profile = toRealtimeAgentProfile(agent);
    const session = await ports.provider.mint({
      agentName: profile.name,
      role: profile.role,
      description: profile.description,
      voice: input.voice,
      isTeamLead: profile.isTeamLead,
      history,
      liveContext,
    });
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "無法建立即時語音連線";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
