import { NextRequest, NextResponse } from "next/server";
import { mintRealtimeSession } from "@/lib/openai";
import { getRecentHistory } from "@/lib/meeting-store";
import { getAgentLiveContext } from "@/lib/meeting-context";
import { AGENTS } from "@/lib/agent-data";

const TEAM_LEAD_SLUG = "teamlead";

// 開一場即時語音對談（WebRTC）：幫指定 Agent 的人設向 OpenAI 換一組短效期
// ephemeral token，瀏覽器直接用這組 token 跟 OpenAI 建立語音連線，正式的
// OPENAI_API_KEY 永遠不會離開伺服器。每次切換對談對象（換人／點名）都會
// 重新呼叫這支路由換一個新 token。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : "";
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
  const voice = typeof body.voice === "string" ? body.voice : "alloy";

  const agent = AGENTS.find((a) => a.slug === slug && a.status === "active");
  if (!agent) return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });

  let history = "";
  if (meetingId) {
    try {
      history = await getRecentHistory(meetingId, 8);
    } catch {
      // 脈絡取不到不影響開新的一輪
    }
  }

  let liveContext = "";
  try {
    liveContext = await getAgentLiveContext(agent.slug);
  } catch {
    // 真實資料抓不到就讓 Agent 老實說沒有資料，而不是讓整支路由失敗
  }

  try {
    const session = await mintRealtimeSession({
      agentName: `${agent.personEn} ${agent.personZh}`,
      role: agent.role,
      description: agent.description,
      voice,
      isTeamLead: agent.slug === TEAM_LEAD_SLUG,
      history,
      liveContext,
    });
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "無法建立即時語音連線";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
