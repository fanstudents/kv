import { NextResponse } from "next/server";
import { getPipelineOverview } from "@/lib/teaching-system";

// 營運助理（Morgan）用：企業內訓／公開課程／企業顧問洽詢／報價單的真實現況（來自「教學系統」專案）。
export async function GET() {
  try {
    const overview = await getPipelineOverview();
    return NextResponse.json({ ok: true, data: overview });
  } catch (err) {
    const message = err instanceof Error ? err.message : "讀取失敗";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
