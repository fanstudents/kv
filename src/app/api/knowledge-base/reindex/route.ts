import { NextResponse } from "next/server";
import { createLegacyKnowledgeBaseReindexAdapter } from "@/adapters/knowledge-base/legacy-reindex-adapter";
import { runKnowledgeBaseIndexStats, runKnowledgeBaseReindex } from "@/modules/knowledge-base/reindex-application";

// 重建整個知識庫的檢索索引（第一次啟用檢索、或改過切段規則時用）。
// 平常不需要呼叫——發布與編輯都會自動更新該份文件的索引。
export const maxDuration = 300;

export async function GET() {
  const stats = await runKnowledgeBaseIndexStats(createLegacyKnowledgeBaseReindexAdapter());
  return NextResponse.json({ stats });
}

export async function POST() {
  return NextResponse.json(await runKnowledgeBaseReindex(createLegacyKnowledgeBaseReindexAdapter()));
}
