import { NextRequest, NextResponse } from "next/server";
import { createLegacyAgentTestPushAdapter } from "@/adapters/agents/legacy-test-push-adapter";
import { runAgentTestPush } from "@/modules/agents/test-push-application";
import { parseAgentTestPushRequest } from "@/modules/agents/test-push-rules";

// 客服 Agent（Amber）用的是獨立的 LINE 頻道（客服機器人既有帳號），不是其他 Agent
// 共用的主頻道——測試推播沒有依 slug 分流的話，會拿主頻道的憑證發送，就算客服頻道
// 的 LINE_SUPPORT_CHANNEL_* 完全沒設定，這個按鈕照樣「測試成功」，等於測不出真正
// 會用到的那組憑證有沒有問題。
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = parseAgentTestPushRequest(slug, body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  const result = await runAgentTestPush(parsed.input, createLegacyAgentTestPushAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json({ ok: true, activity: result.activity });
}
