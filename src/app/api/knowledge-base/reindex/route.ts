import { NextResponse } from "next/server";
import { createSupabaseKnowledgeIndex } from "@/adapters/knowledge-base/supabase-knowledge-adapters";
import { readKnowledgeIndexStats, rebuildKnowledgeIndex } from "@/modules/knowledge-base/search-index";

// 重建整個知識庫的檢索索引（第一次啟用檢索、或改過切段規則時用）。
// 平常不需要呼叫——發布與編輯都會自動更新該份文件的索引。
export const maxDuration = 300;

export async function GET() {
  const stats = await readKnowledgeIndexStats(createSupabaseKnowledgeIndex());
  return NextResponse.json({ stats });
}

export async function POST() {
  return NextResponse.json(await rebuildKnowledgeIndex(createSupabaseKnowledgeIndex()));
}
