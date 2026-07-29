import { NextRequest, NextResponse } from "next/server";
import { logRealtimeUsage, type RealtimeUsage } from "@/lib/ai-usage";
import { meetingRunId } from "@/lib/meeting-store";
import { withRun } from "@/lib/run-context";

// 即時語音會議每一輪回覆結束，前端把 OpenAI 回報的實際 token 用量丟過來記錄。
// 之前完全沒有這支路由——Realtime 是瀏覽器直接跟 OpenAI 建 WebRTC 連線，
// 我們的伺服器端從來看不到那些流量，成本自然也就沒進過「AI 使用成本」頁面。
//
// 帶上 meetingId 的話，這筆花費會歸屬到那場會議的執行；沒帶就只進總帳。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const model = typeof body.model === "string" ? body.model : "";
  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug : undefined;
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
  const usage: RealtimeUsage = body.usage && typeof body.usage === "object" ? body.usage : {};

  if (!model) return NextResponse.json({ error: "缺少 model" }, { status: 400 });

  const runId = meetingId ? await meetingRunId(meetingId) : null;
  const log = () => logRealtimeUsage({ agentSlug, model, usage });

  if (runId) await withRun({ runId, agentSlug: agentSlug ?? "teamlead" }, log);
  else await log();

  return NextResponse.json({ ok: true });
}
