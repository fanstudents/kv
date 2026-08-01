import "server-only";
import { embedKnowledgeTexts } from "@/adapters/knowledge-base/openai-knowledge-provider";
import { getSupabase } from "@/lib/supabase";
import { levelInfo, type KnowledgeLevel } from "@/lib/knowledge-base-data";

// 知識庫檢索：把「已發布」的條目切段、向量化存進 kb_chunks，回答時只取跟問題最相關的幾段。
//
// 這取代原本的「全量塞進 prompt」——那個做法在 12 條時沒事，匯入一份 PDF 變成 200 條之後
// 就會撐爆 context，而且截斷是照順序砍，砍掉的可能正好是要用的那條。
//
// 分級治理守在資料庫那一層：match_kb_chunks 這支函式帶 max_level 參數，
// 超過等級的段落根本不會被回傳，不是靠應用層記得過濾。

/** 一條知識切成幾段：短的就一段，長的照段落切，每段保留標題當上下文 */
function splitContent(title: string, content: string, maxChars = 900): string[] {
  const body = content.trim();
  if (body.length <= maxChars) return [`${title}\n${body}`];

  const paragraphs = body.split(/\n{2,}/);
  const parts: string[] = [];
  let buffer = "";
  for (const p of paragraphs) {
    if (buffer.length + p.length > maxChars && buffer) {
      parts.push(`${title}\n${buffer.trim()}`);
      buffer = "";
    }
    buffer += (buffer ? "\n\n" : "") + p;
  }
  if (buffer.trim()) parts.push(`${title}\n${buffer.trim()}`);
  return parts;
}

/** 把幾條知識重新建立索引（發布或編輯後呼叫）。best-effort：索引失敗不影響知識本身。 */
export async function indexDocs(docIds: string[]): Promise<number> {
  if (docIds.length === 0) return 0;
  try {
    const supabase = getSupabase();
    const { data: docs } = await supabase
      .from("knowledge_base")
      .select("id,title,content,level,status,source_page")
      .in("id", docIds);

    const rows: {
      doc_id: string;
      chunk_index: number;
      title: string;
      content: string;
      level: number;
      source_page: number | null;
      token_estimate: number;
    }[] = [];

    for (const doc of docs ?? []) {
      // 只索引已發布的：草稿還沒人審過，不該被檢索到
      if (doc.status !== "published" || !doc.content) continue;
      splitContent(doc.title as string, doc.content as string).forEach((chunk, i) => {
        rows.push({
          doc_id: doc.id as string,
          chunk_index: i,
          title: doc.title as string,
          content: chunk,
          level: doc.level as number,
          source_page: (doc.source_page as number) ?? null,
          token_estimate: Math.ceil(chunk.length / 2),
        });
      });
    }

    // 先清掉這些文件的舊段落（內容改過的話段落數可能變少）
    await supabase.from("kb_chunks").delete().in("doc_id", docIds);
    if (rows.length === 0) return 0;

    const vectors = await embedKnowledgeTexts(rows.map((r) => r.content));
    const withEmbedding = rows.map((r, i) => ({ ...r, embedding: JSON.stringify(vectors[i] ?? []) }));

    const { error } = await supabase.from("kb_chunks").insert(withEmbedding);
    if (error) throw new Error(error.message);
    return withEmbedding.length;
  } catch {
    return 0;
  }
}

export interface KbHit {
  docId: string;
  title: string;
  content: string;
  level: KnowledgeLevel;
  sourcePage: number | null;
  similarity: number;
}

/** 依問題找出最相關的幾段知識（只在呼叫者的等級以內） */
export async function searchKnowledge(params: {
  question: string;
  maxLevel: KnowledgeLevel;
  limit?: number;
  /** 相似度低於這個值就不採用——寧可少給，也不要塞不相關的東西進 prompt */
  minSimilarity?: number;
}): Promise<KbHit[]> {
  try {
    const [embedding] = await embedKnowledgeTexts([params.question], "知識庫檢索");
    if (!embedding) return [];

    const { data, error } = await getSupabase().rpc("match_kb_chunks", {
      query_embedding: JSON.stringify(embedding),
      max_level: params.maxLevel,
      match_count: params.limit ?? 6,
    });
    if (error) return [];

    const min = params.minSimilarity ?? 0.25;
    return (data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => Number(r.similarity) >= min)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => ({
        docId: r.doc_id as string,
        title: r.title as string,
        content: r.content as string,
        level: r.level as KnowledgeLevel,
        sourcePage: (r.source_page as number) ?? null,
        similarity: Number(r.similarity),
      }));
  } catch {
    return [];
  }
}

/** 把檢索結果排成一段可以塞進 prompt 的文字 */
export function formatHits(hits: KbHit[]): string {
  if (hits.length === 0) return "";
  return [
    "以下是知識庫中跟這個問題最相關的內容（只列出你有權限讀到的）：",
    ...hits.map((h) => {
      const page = h.sourcePage ? `（出處：第 ${h.sourcePage} 頁）` : "";
      return `- 【${levelInfo(h.level).label}】${h.content}${page}`;
    }),
    "回答時請以上述內容為準；上面沒有的就照實說明知識庫查不到，不要自行補充。",
  ].join("\n");
}

/** 目前索引狀態（後台顯示用） */
export async function indexStats(): Promise<{ chunks: number; docs: number }> {
  try {
    const supabase = getSupabase();
    const { count: chunks } = await supabase.from("kb_chunks").select("id", { count: "exact", head: true });
    const { data } = await supabase.from("kb_chunks").select("doc_id");
    const docs = new Set((data ?? []).map((r) => r.doc_id as string)).size;
    return { chunks: chunks ?? 0, docs };
  } catch {
    return { chunks: 0, docs: 0 };
  }
}
