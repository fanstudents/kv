import { NextRequest, NextResponse } from "next/server";
import { getLiveTaskState, setLiveTask } from "@/lib/live-task-store";

// /tv 每 1.5 秒輪詢：回傳某 Agent 的「真實現正處理」狀態（不含圖片本體）
export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent") ?? "";
  const t = await getLiveTaskState(agent);
  if (!t) return NextResponse.json({ active: false });
  return NextResponse.json({
    active: true,
    step: t.step,
    status: t.status,
    caption: t.caption,
    hasImage: t.hasImage,
    imageVersion: t.imageVersion,
    updatedAt: t.updatedAt,
  });
}

// 示範用觸發（登入牆保護）：展示時可手動帶動畫，或供測試不經 LINE 觸發
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agent = typeof body.agent === "string" ? body.agent : "";
  if (!agent) return NextResponse.json({ error: "missing agent" }, { status: 400 });
  await setLiveTask(agent, {
    step: typeof body.step === "number" ? body.step : 0,
    status: body.status === "done" ? "done" : body.status === "waiting" ? "waiting" : "active",
    caption: typeof body.caption === "string" ? body.caption : undefined,
    image: typeof body.image === "string" ? body.image : undefined,
  });
  return NextResponse.json({ ok: true });
}
