import { NextRequest, NextResponse } from "next/server";
import { createLegacyKnowledgeBaseRecheckAdapter } from "@/adapters/knowledge-base/legacy-recheck-adapter";
import { runKnowledgeBaseRecheck } from "@/modules/knowledge-base/recheck-application";
import { parseKnowledgeBaseRecheckAuth } from "@/modules/knowledge-base/recheck-rules";

// 知識新鮮度排程：定期重爬網址來源，內容變了就把相關知識標成「待複檢」。
// 不會自動改寫既有條目——網站改版不該無聲無息地改變 Agent 講的話。
// 設定 CRON_SECRET 後需帶 x-cron-key header 才能觸發。
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // 一律要求密鑰（fail-closed）：以前是「有設定才驗證」，等於哪個環境漏設 CRON_SECRET，
  // 這支端點就對全世界開放——而它會觸發推播、爬蟲、燒 API 額度。
  const auth = parseKnowledgeBaseRecheckAuth(process.env.CRON_SECRET, req.headers.get("x-cron-key"));
  if (auth.kind !== "authorized") return NextResponse.json({ error: auth.message }, { status: auth.status });
  return NextResponse.json(await runKnowledgeBaseRecheck(createLegacyKnowledgeBaseRecheckAdapter()));
}
