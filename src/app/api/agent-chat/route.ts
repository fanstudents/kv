import { NextRequest, NextResponse } from "next/server";
import { createAgentChatComposition } from "@/adapters/agent-chat/agent-chat-composition";
import { parseAgentChatRequest, runAgentChat } from "@/modules/agent-chat/chat";

// 網站聊天視窗：老闆 @ 一位 Agent 傳訊息，該 Agent 依真實業務資料用日常口語回覆。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseAgentChatRequest(body);
  if (!input) {
    return NextResponse.json({ error: "缺少 agentSlug 或 message" }, { status: 400 });
  }
  const result = await runAgentChat(input, createAgentChatComposition());
  if (result.kind === "agent-not-found") {
    return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });
  }
  if (result.kind === "reply-failed") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }
  return NextResponse.json({ reply: result.reply, canvas: result.canvas });
}
