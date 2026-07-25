import { NextRequest, NextResponse } from "next/server";
import { recheckUrlSources } from "@/lib/kb-crawl";

// 知識新鮮度排程：定期重爬網址來源，內容變了就把相關知識標成「待複檢」。
// 不會自動改寫既有條目——網站改版不該無聲無息地改變 Agent 講的話。
// 設定 CRON_SECRET 後需帶 x-cron-key header 才能觸發。
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await recheckUrlSources(10);
  return NextResponse.json({ ok: true, ...result });
}
