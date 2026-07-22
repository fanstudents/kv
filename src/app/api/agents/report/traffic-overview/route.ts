import { NextResponse } from "next/server";
import { getTrafficOverview } from "@/lib/ga4";

// 數據助理（Ivy）用：真實 GA4 近 14 天流量、轉換與渠道拆分。
export async function GET() {
  try {
    const overview = await getTrafficOverview();
    return NextResponse.json({ ok: true, data: overview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取失敗";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
