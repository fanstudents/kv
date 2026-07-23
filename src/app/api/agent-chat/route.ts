import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { getAgentLiveContext } from "@/lib/meeting-context";
import { replyToChat } from "@/lib/openai";
import { buildCanvasForReply } from "@/lib/chat-canvas";

const TEAM_LEAD_SLUG = "teamlead";

// 網站聊天視窗：老闆 @ 一位 Agent 傳訊息，該 Agent 依真實業務資料用日常口語回覆。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = typeof body.history === "string" ? body.history : "";

  if (!agentSlug || !message) {
    return NextResponse.json({ error: "缺少 agentSlug 或 message" }, { status: 400 });
  }

  const agent = AGENTS.find((a) => a.slug === agentSlug);
  if (!agent) return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });

  let liveContext = "";
  try {
    liveContext = await getAgentLiveContext(agentSlug);
  } catch {
    // 真實資料抓不到就照實跟老闆說沒有，不阻塞聊天
  }

  let text: string;
  try {
    text = await replyToChat({
      agent: {
        slug: agent.slug,
        name: `${agent.personEn} ${agent.personZh}`,
        role: agent.role,
        description: agent.description,
      },
      message,
      liveContext,
      history,
      isTeamLead: agent.slug === TEAM_LEAD_SLUG,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "回覆失敗";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let canvas = null;
  try {
    canvas = await buildCanvasForReply(agentSlug, message);
  } catch {
    // 圖表資料抓不到就不附畫布，不影響文字回覆
  }

  return NextResponse.json({ reply: text || "收到，我確認後回覆您。", canvas });
}
