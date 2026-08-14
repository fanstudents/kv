import "server-only";

import {
  citeKnowledge,
  getAgentMaxLevel,
  listKnowledgeDocs,
} from "@/adapters/knowledge-base/supabase-knowledge-store";
import { levelInfo } from "@/lib/knowledge-base-data";
import { formatHits, searchKnowledge } from "@/lib/kb-search";

// 知識庫的「真實資料」由 Supabase adapter store 管理（knowledge_base／
// knowledge_access／kb_citations 表）。這個檔案只保留 Agent 對話所需的 context 組裝，
// 避免資料庫查詢、文件 CRUD、audit 寫入和 prompt 組裝再次混在同一個 legacy helper 裡。
//
// 三個狀態：draft（AI 轉出來待人審，不進 prompt）→ published（生效）→ archived（退場但留著可追溯）。

/** 沒有問題可檢索時（例如語音會議一開場），只給一份「知識庫有什麼」的目錄 */
const INDEX_LIMIT = 40;

/**
 * 塞進 getAgentLiveContext() 的知識段落。
 *
 * 有問題（文字對話）→ 用向量檢索取最相關的幾段，並記一筆引用紀錄。
 * 沒問題（語音會議一開場、還不知道要問什麼）→ 只給標題目錄，讓 Agent 知道
 * 「我有哪些知識可以查」，而不是把整個知識庫倒進 prompt。
 *
 * 兩種情況都只看已發布的條目，也都受這位 Agent 的讀取上限限制。
 */
export async function knowledgeContext(slug: string, question?: string): Promise<string> {
  const maxLevel = await getAgentMaxLevel(slug);

  if (question && question.trim().length > 1) {
    const hits = await searchKnowledge({ question, maxLevel, limit: 6 });
    if (hits.length > 0) {
      // 記錄「這次回答用到了哪幾條」——之後才答得出哪份知識在幫忙、哪份沒人用
      await Promise.all(
        hits.map((h) => citeKnowledge({ docId: h.docId, agentSlug: slug, question: question.slice(0, 200) }))
      );
      return formatHits(hits);
    }
  }

  const docs = await listKnowledgeDocs({ status: "published" });
  const readable = docs.filter((d) => d.level <= maxLevel);
  const withheld = docs.length - readable.length;
  if (readable.length === 0) return "";

  const listed = readable.slice(0, INDEX_LIMIT);
  const parts: string[] = [];
  parts.push(
    `你的知識庫讀取權限上限為 ${levelInfo(maxLevel).label}。你可以查到的知識有這些主題：\n` +
      listed.map((d) => `- 【${levelInfo(d.level).label}】${d.title}`).join("\n") +
      (readable.length > listed.length ? `\n（另有 ${readable.length - listed.length} 條未列出）` : "")
  );
  parts.push("被問到細節時，就依這些主題裡的內容回答；沒有涵蓋到的就照實說知識庫查不到，不要自行補充。");
  if (withheld > 0) {
    parts.push(`另有 ${withheld} 份文件因等級高於你的讀取權限，未提供內容——如被問起，請照實說明無法讀取，不要編造。`);
  }
  return parts.join("\n");
}
