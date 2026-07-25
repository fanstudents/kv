import { NextRequest, NextResponse } from "next/server";
import { metricHistory } from "@/lib/agent-memory";

// 某個指標近 N 天的走勢（目標卡上的趨勢線用）
export async function GET(req: NextRequest) {
  const metricId = req.nextUrl.searchParams.get("metricId");
  if (!metricId) return NextResponse.json({ error: "缺少 metricId" }, { status: 400 });
  const days = Math.min(180, Math.max(7, Number(req.nextUrl.searchParams.get("days")) || 30));
  return NextResponse.json({ points: await metricHistory(metricId, days) });
}
