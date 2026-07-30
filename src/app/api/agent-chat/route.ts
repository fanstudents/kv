import { NextRequest, NextResponse } from "next/server";
import { createLegacyAgentChatAdapters } from "@/adapters/agent-chat/legacy-agent-chat-adapters";
import {
  parseAgentChatRequest,
  withAgentChatReplyFallback,
} from "@/modules/agent-chat/rules";

// 網站聊天視窗：老闆 @ 一位 Agent 傳訊息，該 Agent 依真實業務資料用日常口語回覆。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseAgentChatRequest(body);
  if (!input) {
    return NextResponse.json({ error: "缺少 agentSlug 或 message" }, { status: 400 });
  }
  const { agentSlug, message, history } = input;
  const ports = createLegacyAgentChatAdapters();

  const agent = ports.agents.find(agentSlug);
  if (!agent) return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });

  let liveContext = "";
  try {
    // 把使用者這句話一起傳進去：知識庫那段會依問題檢索，而不是全量塞
    liveContext = await ports.context.load(agentSlug, message);
  } catch {
    // 真實資料抓不到就照實跟老闆說沒有，不阻塞聊天
  }

  let text: string;
  try {
    text = await ports.replies.generate({
      agent,
      message,
      liveContext,
      history,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "回覆失敗";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let canvas = null;
  try {
    canvas = await ports.canvas.build({
      agent,
      message,
      replyText: text,
    });
  } catch {
    // 畫布資料抓不到就不附畫布，不影響文字回覆
  }

  return NextResponse.json({ reply: withAgentChatReplyFallback(text), canvas });
}
