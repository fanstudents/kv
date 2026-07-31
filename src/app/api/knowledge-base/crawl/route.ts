import { NextRequest, NextResponse } from "next/server";
import { createFirecrawlKnowledgeSource } from "@/adapters/knowledge-base/firecrawl-knowledge-source";
import {
  importKnowledgeFromUrl,
  parseKnowledgeCrawlImport,
  parseKnowledgeCrawlPreview,
  previewKnowledgeCrawl,
} from "@/modules/knowledge-base/crawl-source";

// 從網址匯入知識：GET 先預覽整站有幾頁（成本透明），POST 才真的抓並轉成草稿。
export const maxDuration = 300;

/** 整站爬之前先看有哪些頁，讓人知道會花多少額度 */
export async function GET(req: NextRequest) {
  const query = parseKnowledgeCrawlPreview(req.nextUrl.searchParams.get("url"));
  if (query.kind === "invalid") return NextResponse.json({ error: query.message }, { status: 400 });
  const adapter = createFirecrawlKnowledgeSource();
  try {
    return NextResponse.json(await previewKnowledgeCrawl(query, adapter));
  } catch (err) {
    const status = adapter.isQuotaError(err) ? 429 : 502;
    return NextResponse.json({ error: err instanceof Error ? err.message : "預覽失敗" }, { status });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseKnowledgeCrawlImport(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  const adapter = createFirecrawlKnowledgeSource();

  try {
    return NextResponse.json(await importKnowledgeFromUrl(parsed.input, adapter));
  } catch (err) {
    // 額度／限流問題回 429 並附上看得懂的說明，不要讓使用者看到 HTTP 代碼
    const status = adapter.isQuotaError(err) ? 429 : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : "匯入失敗" }, { status });
  }
}
