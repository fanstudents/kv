import { NextResponse } from "next/server";
import { getSearchOverview } from "@/lib/gsc";

// SEO 助理（Leo）用：真實 Search Console 近 28 天成效，含每日趨勢與熱門關鍵字。
export async function GET() {
  try {
    const overview = await getSearchOverview();
    return NextResponse.json({ ok: true, data: overview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取失敗";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
