import { NextResponse } from "next/server";
import { indexDocs, indexStats } from "@/lib/kb-search";
import { listKnowledgeDocs } from "@/lib/knowledge-base";

// 重建整個知識庫的檢索索引（第一次啟用檢索、或改過切段規則時用）。
// 平常不需要呼叫——發布與編輯都會自動更新該份文件的索引。
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ stats: await indexStats() });
}

export async function POST() {
  const docs = await listKnowledgeDocs({ status: "published" });
  const withContent = docs.filter((d) => d.content && d.content.trim().length > 0);
  const chunks = await indexDocs(withContent.map((d) => d.id));
  return NextResponse.json({
    published: docs.length,
    indexable: withContent.length,
    chunks,
    stats: await indexStats(),
  });
}
