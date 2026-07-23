import { NextRequest, NextResponse } from "next/server";
import { getSearchOverview } from "@/lib/gsc";

// SEO 助理（Leo）用：真實 Search Console 成效，?days= 選擇統計區間（預設 7 天）。
export async function GET(req: NextRequest) {
  const days = Number(req.nextUrl.searchParams.get("days")) || 7;
  try {
    const overview = await getSearchOverview(days);
    return NextResponse.json({ ok: true, data: overview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取失敗";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
