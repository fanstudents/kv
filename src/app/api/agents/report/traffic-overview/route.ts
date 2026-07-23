import { NextRequest, NextResponse } from "next/server";
import { getTrafficOverview } from "@/lib/ga4";

// 數據助理（Ivy）用：真實 GA4 流量、轉換與渠道拆分，?days= 選擇統計區間（預設 7 天）。
export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days")) || 7;
  try {
    const overview = await getTrafficOverview(days);
    return NextResponse.json({ ok: true, data: overview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取失敗";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
