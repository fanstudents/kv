import "server-only";
import { getMainSupabase } from "@/lib/supabase";
import { normalizeDatabaseJson } from "@/lib/database-json";
import type { Database } from "@/lib/database.types";
import { AGENTS } from "@/lib/agent-data";
import {
  levelInfo,
  type KnowledgeDoc,
  type KnowledgeKind,
  type KnowledgeLevel,
  type KnowledgeStatus,
} from "@/lib/knowledge-base-data";
import { formatHits, indexDocs, searchKnowledge } from "@/lib/kb-search";
import type { AgentSlug } from "@/lib/types";

// 知識庫的「真實資料」層：文件與 Agent 讀取權限存在 Supabase（knowledge_base／
// knowledge_access 表），/knowledge-base 頁面編輯的就是這兩張表。knowledgeContext()
// 是實際接進 Agent 對話的地方——依 Agent 被指派的等級過濾文件，只把等級內的
// 內容塞進真實業務資料，示範資料分級不是裝飾用的 UI，而是真的會影響 Agent 答得出什麼。
//
// 三個狀態：draft（AI 轉出來待人審，不進 prompt）→ published（生效）→ archived（退場但留著可追溯）。

type KnowledgeBaseRow = Database["public"]["Tables"]["knowledge_base"]["Row"];
type KnowledgeBaseInsert = Database["public"]["Tables"]["knowledge_base"]["Insert"];
type KnowledgeBaseUpdate = Database["public"]["Tables"]["knowledge_base"]["Update"];
type KnowledgeBaseDocRecord = Pick<KnowledgeBaseRow, "id" | "title" | "category" | "level"> &
  Partial<
    Pick<
      KnowledgeBaseRow,
      | "content"
      | "builtin"
      | "status"
      | "kind"
      | "updated_at"
      | "version"
      | "owner"
      | "review_at"
      | "source_doc_id"
      | "source_page"
      | "meta"
    >
  >;

function toDoc(row: KnowledgeBaseDocRecord): KnowledgeDoc {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    level: row.level as KnowledgeLevel,
    content: row.content ?? undefined,
    builtin: row.builtin ?? false,
    status: (row.status ?? "published") as KnowledgeStatus,
    kind: (row.kind ?? "doc") as KnowledgeKind,
    updatedAt: row.updated_at ?? undefined,
    version: row.version ?? 1,
    owner: row.owner ?? null,
    reviewAt: row.review_at ?? null,
    sourceDocId: row.source_doc_id ?? null,
    sourcePage: row.source_page ?? null,
    meta:
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {},
  };
}

const DOC_COLUMNS =
  "id,title,category,level,content,builtin,status,kind,updated_at,version,owner,review_at,source_doc_id,source_page,meta";

export async function listKnowledgeDocs(filter?: {
  status?: KnowledgeStatus;
  sourceDocId?: string;
}): Promise<KnowledgeDoc[]> {
  const supabase = getMainSupabase();
  let query = supabase.from("knowledge_base").select(DOC_COLUMNS);
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.sourceDocId) query = query.eq("source_doc_id", filter.sourceDocId);
  const { data, error } = await query
    .order("level", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toDoc);
}

export async function addKnowledgeDoc(doc: {
  title: string;
  category: string;
  level: KnowledgeLevel;
  content?: string;
  kind?: KnowledgeKind;
  status?: KnowledgeStatus;
  sourceDocId?: string;
  sourcePage?: number;
  reviewAt?: string | null;
  meta?: Record<string, unknown>;
}): Promise<KnowledgeDoc> {
  const supabase = getMainSupabase();
  const row: KnowledgeBaseInsert = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    builtin: false,
    title: doc.title,
    category: doc.category,
    level: doc.level,
    content: doc.content ?? null,
    kind: doc.kind ?? "doc",
    status: doc.status ?? "published",
    source_doc_id: doc.sourceDocId ?? null,
    source_page: doc.sourcePage ?? null,
    review_at: doc.reviewAt ?? null,
    meta: normalizeDatabaseJson(doc.meta),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("knowledge_base").insert(row);
  if (error) throw new Error(error.message);
  return toDoc(row);
}

/** 批次寫入（PDF 轉出來的候選條目一次進來，一律先當草稿） */
export async function addKnowledgeDocs(
  docs: Parameters<typeof addKnowledgeDoc>[0][]
): Promise<KnowledgeDoc[]> {
  if (docs.length === 0) return [];
  const supabase = getMainSupabase();
  const now = new Date().toISOString();
  const rows: KnowledgeBaseInsert[] = docs.map((doc, i) => ({
    id: `custom-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    builtin: false,
    title: doc.title,
    category: doc.category,
    level: doc.level,
    content: doc.content ?? null,
    kind: doc.kind ?? "faq",
    status: doc.status ?? "draft",
    source_doc_id: doc.sourceDocId ?? null,
    source_page: doc.sourcePage ?? null,
    review_at: doc.reviewAt ?? null,
    meta: normalizeDatabaseJson(doc.meta),
    updated_at: now,
  }));
  const { error } = await supabase.from("knowledge_base").insert(rows);
  if (error) throw new Error(error.message);
  return rows.map(toDoc);
}

/** 更新一份文件——原本只有新增與刪除，改一個字得刪掉重建（id 還會變）。 */
export async function updateKnowledgeDoc(
  id: string,
  patch: {
    title?: string;
    category?: string;
    level?: KnowledgeLevel;
    content?: string;
    kind?: KnowledgeKind;
    status?: KnowledgeStatus;
    owner?: string | null;
    reviewAt?: string | null;
  }
): Promise<KnowledgeDoc | null> {
  const supabase = getMainSupabase();
  const { data: prev, error: previousError } = await supabase
    .from("knowledge_base")
    .select("version")
    .eq("id", id)
    .maybeSingle();
  if (previousError) throw new Error(previousError.message);

  const update: KnowledgeBaseUpdate = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.level !== undefined) update.level = patch.level;
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.owner !== undefined) update.owner = patch.owner;
  if (patch.reviewAt !== undefined) update.review_at = patch.reviewAt;
  // 內容有變才進版；只改狀態（例如發布、封存）不算新版本
  const contentChanged =
    patch.title !== undefined || patch.content !== undefined || patch.level !== undefined || patch.kind !== undefined;
  if (contentChanged) update.version = Number(prev?.version ?? 1) + 1;

  const { data, error } = await supabase
    .from("knowledge_base")
    .update(update)
    .eq("id", id)
    .select(DOC_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  // 內容或等級變了就重建索引（封存／草稿化會讓這份文件的段落被清掉）
  await indexDocs([id]);
  return toDoc(data);
}

/** 批次發布（人審通過的草稿一次上線） */
export async function publishKnowledgeDocs(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await getMainSupabase()
    .from("knowledge_base")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id");
  if (error) throw new Error(error.message);
  // 發布之後才建索引——草稿不進檢索，也就進不了任何 Agent 的回答
  await indexDocs(ids);
  return data?.length ?? 0;
}

export type RemoveResult = "deleted" | "not-found" | "builtin-protected";

/**
 * 刪除一份文件。內建示範文件不給刪（會回 builtin-protected，讓上層照實告訴使用者，
 * 而不是像之前一樣：刪不掉但畫面假裝刪掉了，重整又跑回來）。
 */
export async function removeKnowledgeDoc(id: string): Promise<RemoveResult> {
  const supabase = getMainSupabase();
  const { data: doc, error: lookupError } = await supabase
    .from("knowledge_base")
    .select("id,builtin")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!doc) return "not-found";
  if (doc.builtin) return "builtin-protected";
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return "deleted";
}

export async function listAgentAccess(): Promise<Record<AgentSlug, KnowledgeLevel>> {
  const supabase = getMainSupabase();
  const { data, error } = await supabase.from("knowledge_access").select("agent_slug,max_level");
  if (error) throw new Error(error.message);
  const access = {} as Record<AgentSlug, KnowledgeLevel>;
  for (const row of data ?? []) {
    access[row.agent_slug as AgentSlug] = row.max_level as KnowledgeLevel;
  }
  for (const agent of AGENTS) {
    if (!(agent.slug in access)) access[agent.slug] = 1;
  }
  return access;
}

export async function setAgentAccess(slug: AgentSlug, level: KnowledgeLevel): Promise<void> {
  const supabase = getMainSupabase();
  const { error } = await supabase
    .from("knowledge_access")
    .upsert({ agent_slug: slug, max_level: level, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function getAgentMaxLevel(slug: string): Promise<KnowledgeLevel> {
  const supabase = getMainSupabase();
  const { data, error } = await supabase
    .from("knowledge_access")
    .select("max_level")
    .eq("agent_slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.max_level as KnowledgeLevel) ?? 1;
}

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

/** 記錄一次引用：哪位 Agent 為了回答什麼、用到了哪一條知識（驗證知識有沒有在幫忙） */
export async function citeKnowledge(params: {
  docId: string;
  agentSlug?: string;
  question?: string;
  runId?: string | null;
}): Promise<void> {
  try {
    await getMainSupabase().from("kb_citations").insert({
      doc_id: params.docId,
      agent_slug: params.agentSlug ?? null,
      question: params.question ?? null,
      run_id: params.runId ?? null,
    });
  } catch {
    /* best-effort */
  }
}
