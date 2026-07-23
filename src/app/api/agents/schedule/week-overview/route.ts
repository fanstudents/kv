import { NextResponse } from "next/server";
import { listWeekOverview } from "@/lib/google";

// 行程助理(Milo)用：真實 Google 行事曆未來七天總覽。
export async function GET() {
  try {
    const overview = await listWeekOverview();
    return NextResponse.json({ ok: true, data: overview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取失敗";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
