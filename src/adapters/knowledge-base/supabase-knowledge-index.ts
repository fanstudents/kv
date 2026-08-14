import "server-only";

import { embedKnowledgeTexts } from "@/adapters/knowledge-base/openai-knowledge-provider";
import { getMainSupabase } from "@/lib/supabase";

/**
 * Main Supabase index owner for the Knowledge Base domain.
 *
 * Indexing is a provider/data boundary, not prompt composition: it reads
 * published documents, asks the embedding provider for vectors, then uses
 * the atomic replace RPC so a failed rebuild never destroys the previous
 * searchable version.
 */

/** 一條知識切成幾段：短的就一段，長的照段落切，每段保留標題當上下文 */
function splitContent(title: string, content: string, maxChars = 900): string[] {
  const body = content.trim();
  if (body.length <= maxChars) return [`${title}\n${body}`];

  const paragraphs = body.split(/\n{2,}/);
  const parts: string[] = [];
  let buffer = "";
  for (const paragraph of paragraphs) {
    if (buffer.length + paragraph.length > maxChars && buffer) {
      parts.push(`${title}\n${buffer.trim()}`);
      buffer = "";
    }
    buffer += (buffer ? "\n\n" : "") + paragraph;
  }
  if (buffer.trim()) parts.push(`${title}\n${buffer.trim()}`);
  return parts;
}

/** 把幾條知識重新建立索引（發布或編輯後呼叫）。 */
export async function indexDocs(docIds: string[]): Promise<number> {
  if (docIds.length === 0) return 0;
  try {
    const supabase = getMainSupabase();
    const { data: docs, error: docsError } = await supabase
      .from("knowledge_base")
      .select("id,title,content,level,status,source_page")
      .in("id", docIds);
    if (docsError) throw new Error(docsError.message);

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
      splitContent(doc.title as string, doc.content as string).forEach((chunk, index) => {
        rows.push({
          doc_id: doc.id as string,
          chunk_index: index,
          title: doc.title as string,
          content: chunk,
          level: doc.level as number,
          source_page: (doc.source_page as number) ?? null,
          token_estimate: Math.ceil(chunk.length / 2),
        });
      });
    }

    const vectors = rows.length > 0 ? await embedKnowledgeTexts(rows.map((row) => row.content)) : [];
    if (vectors.length !== rows.length || vectors.some((vector) => vector.length !== 1536)) {
      throw new Error("Knowledge embedding response does not match the kb_chunks vector contract");
    }
    const withEmbedding = rows.map((row, index) => ({
      ...row,
      embedding: JSON.stringify(vectors[index]),
    }));

    // 刪除舊段落與插入新段落必須在同一個 DB transaction；provider／RPC 失敗時保留上一版索引。
    const { data: replacedCount, error } = await supabase.rpc("replace_kb_chunks", {
      p_doc_ids: docIds,
      p_chunks: withEmbedding,
    });
    if (error) throw new Error(error.message);
    return Number(replacedCount ?? 0);
  } catch (error) {
    console.error("[knowledge-base] index update failed", error);
    return 0;
  }
}

/** 目前索引狀態（後台顯示用） */
export async function indexStats(): Promise<{ chunks: number; docs: number }> {
  try {
    const supabase = getMainSupabase();
    const { count: chunks } = await supabase.from("kb_chunks").select("id", { count: "exact", head: true });
    const { data } = await supabase.from("kb_chunks").select("doc_id");
    const docs = new Set((data ?? []).map((row) => row.doc_id as string)).size;
    return { chunks: chunks ?? 0, docs };
  } catch {
    return { chunks: 0, docs: 0 };
  }
}
