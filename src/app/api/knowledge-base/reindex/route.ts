import { NextResponse } from "next/server";
import { supabaseKnowledgeIndexRepository } from "@/adapters/knowledge-base/supabase-knowledge-adapters";
import { readKnowledgeIndexStats, rebuildKnowledgeIndex } from "@/modules/knowledge-base/search-index";

// 重建整個知識庫的檢索索引（第一次啟用檢索、或改過切段規則時用）。
// 平常不需要呼叫——發布與編輯都會自動更新該份文件的索引。
export const maxDuration = 300;

function indexFailure(error: unknown) {
  console.error("[knowledge-base] reindex request failed", error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "知識庫索引服務暫時無法使用" },
    { status: 503 },
  );
}

export async function GET() {
  try {
    const stats = await readKnowledgeIndexStats(supabaseKnowledgeIndexRepository);
    return NextResponse.json({ stats });
  } catch (error) {
    return indexFailure(error);
  }
}

export async function POST() {
  try {
    return NextResponse.json(await rebuildKnowledgeIndex(supabaseKnowledgeIndexRepository));
  } catch (error) {
    return indexFailure(error);
  }
}
