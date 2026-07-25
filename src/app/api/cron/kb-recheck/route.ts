import { NextRequest, NextResponse } from "next/server";
import { recheckUrlSources } from "@/lib/kb-crawl";

// 知識新鮮度排程：定期重爬網址來源，內容變了就把相關知識標成「待複檢」。
// 不會自動改寫既有條目——網站改版不該無聲無息地改變 Agent 講的話。
// 設定 CRON_SECRET 後需帶 x-cron-key header 才能觸發。
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // 一律要求密鑰（fail-closed）：以前是「有設定才驗證」，等於哪個環境漏設 CRON_SECRET，
  // 這支端點就對全世界開放——而它會觸發推播、爬蟲、燒 API 額度。
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "server misconfigured: CRON_SECRET not set" }, { status: 503 });
  }
  if (req.headers.get("x-cron-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await recheckUrlSources(10);
  return NextResponse.json({ ok: true, ...result });
}
