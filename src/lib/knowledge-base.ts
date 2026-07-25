import "server-only";
import { getSupabase } from "@/lib/supabase";
import { AGENTS } from "@/lib/agent-data";
import {
  levelInfo,
  type KnowledgeDoc,
  type KnowledgeKind,
  type KnowledgeLevel,
  type KnowledgeStatus,
} from "@/lib/knowledge-base-data";
import type { AgentSlug } from "@/lib/types";

// 知識庫的「真實資料」層：文件與 Agent 讀取權限存在 Supabase（knowledge_base／
// knowledge_access 表），/knowledge-base 頁面編輯的就是這兩張表。knowledgeContext()
// 是實際接進 Agent 對話的地方——依 Agent 被指派的等級過濾文件，只把等級內的
// 內容塞進真實業務資料，示範資料分級不是裝飾用的 UI，而是真的會影響 Agent 答得出什麼。
//
// 三個狀態：draft（AI 轉出來待人審，不進 prompt）→ published（生效）→ archived（退場但留著可追溯）。

/* eslint-disable @typescript-eslint/no-explicit-any */
function toDoc(row: any): KnowledgeDoc {
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
    meta: row.meta ?? {},
  };
}

const DOC_COLUMNS =
  "id,title,category,level,content,builtin,status,kind,updated_at,version,owner,review_at,source_doc_id,source_page,meta";

export async function listKnowledgeDocs(filter?: {
  status?: KnowledgeStatus;
  sourceDocId?: string;
}): Promise<KnowledgeDoc[]> {
  const supabase = getSupabase();
  let query = supabase.from("knowledge_base").select(DOC_COLUMNS);
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.sourceDocId) query = query.eq("source_doc_id", filter.sourceDocId);
  const { data } = await query.order("level", { ascending: true }).order("created_at", { ascending: true });
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
  const supabase = getSupabase();
  const row = {
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
    meta: doc.meta ?? {},
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
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const rows = docs.map((doc, i) => ({
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
    meta: doc.meta ?? {},
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
  const supabase = getSupabase();
  const { data: prev } = await supabase.from("knowledge_base").select("version").eq("id", id).maybeSingle();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
  return data ? toDoc(data) : null;
}

/** 批次發布（人審通過的草稿一次上線） */
export async function publishKnowledgeDocs(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const { data, error } = await getSupabase()
    .from("knowledge_base")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export type RemoveResult = "deleted" | "not-found" | "builtin-protected";

/**
 * 刪除一份文件。內建示範文件不給刪（會回 builtin-protected，讓上層照實告訴使用者，
 * 而不是像之前一樣：刪不掉但畫面假裝刪掉了，重整又跑回來）。
 */
export async function removeKnowledgeDoc(id: string): Promise<RemoveResult> {
  const supabase = getSupabase();
  const { data: doc } = await supabase.from("knowledge_base").select("id,builtin").eq("id", id).maybeSingle();
  if (!doc) return "not-found";
  if (doc.builtin) return "builtin-protected";
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return "deleted";
}

export async function listAgentAccess(): Promise<Record<AgentSlug, KnowledgeLevel>> {
  const supabase = getSupabase();
  const { data } = await supabase.from("knowledge_access").select("agent_slug,max_level");
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
  const supabase = getSupabase();
  const { error } = await supabase
    .from("knowledge_access")
    .upsert({ agent_slug: slug, max_level: level, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function getAgentMaxLevel(slug: string): Promise<KnowledgeLevel> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("knowledge_access")
    .select("max_level")
    .eq("agent_slug", slug)
    .maybeSingle();
  return (data?.max_level as KnowledgeLevel) ?? 1;
}

/** 塞進 prompt 的字數上限：知識庫一旦匯入整份 PDF，全量塞會直接把 context 撐爆。 */
const CONTEXT_CHAR_BUDGET = 6000;

/**
 * 塞進 getAgentLiveContext()：依這位 Agent 的可讀取上限，只把等級內、已發布的條目給他。
 * 草稿（AI 轉出來還沒人審）永遠不會進 prompt——這是人審這一關真正的意義。
 * 另外有字數預算：超過就先給等級低、比較新的，並在最後照實說明還有幾條沒放進來。
 */
export async function knowledgeContext(slug: string): Promise<string> {
  const maxLevel = await getAgentMaxLevel(slug);
  const docs = await listKnowledgeDocs({ status: "published" });
  const readable = docs.filter((d) => d.level <= maxLevel);
  const withheld = docs.length - readable.length;

  if (readable.length === 0) return "";

  const lines: string[] = [];
  let used = 0;
  let dropped = 0;
  for (const d of readable) {
    const source = d.sourcePage ? `（出處：第 ${d.sourcePage} 頁）` : "";
    const line = `- 【${levelInfo(d.level).label}】${d.title}：${d.content ?? "（無內容摘要）"}${source}`;
    if (used + line.length > CONTEXT_CHAR_BUDGET) {
      dropped += 1;
      continue;
    }
    lines.push(line);
    used += line.length;
  }

  const parts: string[] = [];
  parts.push(`你的知識庫讀取權限上限為 ${levelInfo(maxLevel).label}，以下是你能讀到的內容：\n${lines.join("\n")}`);
  if (dropped > 0) {
    parts.push(`另有 ${dropped} 條因長度限制未放入，若使用者問到相關細節，請說明需要查閱完整知識庫。`);
  }
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
    await getSupabase().from("kb_citations").insert({
      doc_id: params.docId,
      agent_slug: params.agentSlug ?? null,
      question: params.question ?? null,
      run_id: params.runId ?? null,
    });
  } catch {
    /* best-effort */
  }
}
