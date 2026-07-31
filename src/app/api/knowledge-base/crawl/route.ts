import { NextRequest, NextResponse } from "next/server";
import { createLegacyKnowledgeBaseCrawlImportAdapter } from "@/adapters/knowledge-base/legacy-crawl-import-adapter";
import { createLegacyKnowledgeBaseCrawlPreviewAdapter } from "@/adapters/knowledge-base/legacy-crawl-preview-adapter";
import { runKnowledgeBaseCrawlImport } from "@/modules/knowledge-base/crawl-import-application";
import { parseKnowledgeBaseCrawlImportRequest } from "@/modules/knowledge-base/crawl-import-rules";
import { runKnowledgeBaseCrawlPreview } from "@/modules/knowledge-base/crawl-preview-application";
import { parseKnowledgeBaseCrawlPreviewQuery } from "@/modules/knowledge-base/crawl-preview-rules";

// 從網址匯入知識：GET 先預覽整站有幾頁（成本透明），POST 才真的抓並轉成草稿。
export const maxDuration = 300;

/** 整站爬之前先看有哪些頁，讓人知道會花多少額度 */
export async function GET(req: NextRequest) {
  const query = parseKnowledgeBaseCrawlPreviewQuery(req.nextUrl.searchParams.get("url"));
  if (query.kind === "invalid") return NextResponse.json({ error: query.message }, { status: 400 });
  const adapter = createLegacyKnowledgeBaseCrawlPreviewAdapter();
  try {
    return NextResponse.json(await runKnowledgeBaseCrawlPreview(query, adapter));
  } catch (err) {
    const status = adapter.isQuotaError(err) ? 429 : 502;
    return NextResponse.json({ error: err instanceof Error ? err.message : "預覽失敗" }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseKnowledgeBaseCrawlImportRequest(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  const adapter = createLegacyKnowledgeBaseCrawlImportAdapter();

  try {
    return NextResponse.json(await runKnowledgeBaseCrawlImport(parsed.input, adapter));
  } catch (err) {
    // 額度／限流問題回 429 並附上看得懂的說明，不要讓使用者看到 HTTP 代碼
    const status = adapter.isQuotaError(err) ? 429 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "匯入失敗" }, { status });
  }
}
