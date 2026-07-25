import { NextRequest, NextResponse } from "next/server";
import { importUrl, mapSite } from "@/lib/kb-crawl";
import { listKnowledgeDocs } from "@/lib/knowledge-base";

// 從網址匯入知識：GET 先預覽整站有幾頁（成本透明），POST 才真的抓並轉成草稿。
export const maxDuration = 300;

function badUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return !["http:", "https:"].includes(u.protocol);
  } catch {
    return true;
  }
}

/** 整站爬之前先看有哪些頁，讓人知道會花多少額度 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || badUrl(url)) return NextResponse.json({ error: "請提供有效的網址" }, { status: 400 });
  try {
    const links = await mapSite(url, 200);
    return NextResponse.json({ count: links.length, links: links.slice(0, 30) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "預覽失敗" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const mode = body.mode === "site" ? "site" : "single";
  const limit = Math.min(60, Math.max(1, Number(body.limit) || 25));

  if (!url || badUrl(url)) return NextResponse.json({ error: "請提供有效的網址（http/https）" }, { status: 400 });

  try {
    const result = await importUrl({ url, mode, limit });
    const docs = await listKnowledgeDocs({ status: "draft", sourceDocId: result.sourceId });
    return NextResponse.json({ ...result, docs });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "匯入失敗" }, { status: 500 });
  }
}
