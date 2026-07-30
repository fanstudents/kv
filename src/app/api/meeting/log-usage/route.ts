import { NextRequest, NextResponse } from "next/server";
import { createLegacyMeetingRealtimeUsageAdapter } from "@/adapters/meeting/legacy-log-usage-adapter";
import { runMeetingRealtimeUsageLog } from "@/modules/meeting/log-usage-application";
import { parseMeetingRealtimeUsageLogRequest } from "@/modules/meeting/log-usage-rules";

// 即時語音會議每一輪回覆結束，前端把 OpenAI 回報的實際 token 用量丟過來記錄。
// 之前完全沒有這支路由——Realtime 是瀏覽器直接跟 OpenAI 建 WebRTC 連線，
// 我們的伺服器端從來看不到那些流量，成本自然也就沒進過「AI 使用成本」頁面。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = parseMeetingRealtimeUsageLogRequest(body);
  const result = await runMeetingRealtimeUsageLog(input, createLegacyMeetingRealtimeUsageAdapter());

  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
