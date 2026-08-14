import "server-only";

import { embedKnowledgeTexts } from "@/adapters/knowledge-base/openai-knowledge-provider";
import { getMainSupabase } from "@/lib/supabase";
import { levelInfo, type KnowledgeLevel } from "@/lib/knowledge-base-data";

// 知識庫檢索：回答時只取跟問題最相關的幾段，並依 Agent 權限限制等級。
// 索引寫入（文件切段、embedding、atomic replace）已移至
// `src/adapters/knowledge-base/supabase-knowledge-index.ts`；這裡只保留查詢與 prompt formatting。

export interface KbHit {
  docId: string;
  title: string;
  content: string;
  level: KnowledgeLevel;
  sourcePage: number | null;
  similarity: number;
}

export type KnowledgeSearchFailureKind = "embedding" | "database" | "invalid-response";

/** 檢索失敗與「沒有符合的段落」不同，不能共用空陣列表示。 */
export class KnowledgeSearchError extends Error {
  constructor(
    public readonly kind: KnowledgeSearchFailureKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "KnowledgeSearchError";
  }
}

/** 依問題找出最相關的幾段知識（只在呼叫者的等級以內） */
export async function searchKnowledge(params: {
  question: string;
  maxLevel: KnowledgeLevel;
  limit?: number;
  /** 相似度低於這個值就不採用——寧可少給，也不要塞不相關的東西進 prompt */
  minSimilarity?: number;
}): Promise<KbHit[]> {
  let embedding: number[] | undefined;
  try {
    [embedding] = await embedKnowledgeTexts([params.question], "知識庫檢索");
  } catch (error) {
    throw new KnowledgeSearchError(
      "embedding",
      error instanceof Error ? error.message : "知識庫向量化失敗",
      { cause: error },
    );
  }

  if (!embedding || embedding.length === 0) {
    throw new KnowledgeSearchError("embedding", "知識庫向量化沒有回傳可用結果");
  }

  let result: { data: unknown; error: { message: string } | null };
  try {
    result = await getMainSupabase().rpc("match_kb_chunks", {
      query_embedding: JSON.stringify(embedding),
      max_level: params.maxLevel,
      match_count: params.limit ?? 6,
    });
  } catch (error) {
    throw new KnowledgeSearchError(
      "database",
      error instanceof Error ? error.message : "知識庫檢索資料庫失敗",
      { cause: error },
    );
  }
  if (result.error) throw new KnowledgeSearchError("database", result.error.message, { cause: result.error });
  if (result.data !== null && result.data !== undefined && !Array.isArray(result.data)) {
    throw new KnowledgeSearchError("invalid-response", "知識庫檢索回應格式無效");
  }

  const min = params.minSimilarity ?? 0.25;
  return (result.data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((row: any) => Number(row.similarity) >= min)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => ({
      docId: row.doc_id as string,
      title: row.title as string,
      content: row.content as string,
      level: row.level as KnowledgeLevel,
      sourcePage: (row.source_page as number) ?? null,
      similarity: Number(row.similarity),
    }));
}

/** 把檢索結果排成一段可以塞進 prompt 的文字 */
export function formatHits(hits: KbHit[]): string {
  if (hits.length === 0) return "";
  return [
    "以下是知識庫中跟這個問題最相關的內容（只列出你有權限讀到的）：",
    ...hits.map((hit) => {
      const page = hit.sourcePage ? `（出處：第 ${hit.sourcePage} 頁）` : "";
      return `- 【${levelInfo(hit.level).label}】${hit.content}${page}`;
    }),
    "回答時請以上述內容為準；上面沒有的就照實說明知識庫查不到，不要自行補充。",
  ].join("\n");
}
