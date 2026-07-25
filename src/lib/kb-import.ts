import "server-only";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { getSupabase } from "@/lib/supabase";
import { chatJson } from "@/lib/openai";
import { addKnowledgeDocs } from "@/lib/knowledge-base";
import type { KnowledgeKind, KnowledgeLevel } from "@/lib/knowledge-base-data";

// PDF → 知識條目的匯入管線：
//   上傳 → 抽文字（保留頁碼）→ 切塊 → AI 轉條目 → 敏感度預判 → 存成草稿 → 人審 → 發布
//
// 兩個刻意的設計：
// 1. **AI 產出的東西一律是草稿**。沒有人按過「通過」就不會進任何 Agent 的 prompt，
//    這是把「AI 會編」這件事擋在知識庫外面唯一有效的一關。
// 2. **每一條都帶來源頁碼**。Agent 回答時可以說「依第 12 頁」，使用者查得到，
//    而且日後要重新萃取也知道要回去看哪裡。

/** 一份原始檔抽出來的一段文字（帶頁碼） */
interface Chunk {
  page: number;
  text: string;
}

export interface KbCandidate {
  question: string;
  answer: string;
  kind: KnowledgeKind;
  level: KnowledgeLevel;
  category: string;
  page: number;
  confidence: number;
  /** 敏感度預判的理由（例如「含金額」「含人名與聯絡方式」） */
  flags: string[];
}

/** 一塊送去轉換的字數上限——太長 AI 會漏、太短會失去上下文 */
const CHUNK_CHARS = 2600;
/** 一次匯入最多處理幾塊（避免一份 300 頁的手冊把成本一次燒完） */
const MAX_CHUNKS = 24;

export function checksumOf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** 抽出 PDF 的文字，逐頁保留（unpdf 的 mergePages=false 會回每一頁一個字串） */
export async function extractPdf(buf: Buffer): Promise<{ pages: string[]; pageCount: number }> {
  const data = new Uint8Array(buf);
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [String(text)];
  return { pages, pageCount: pdf.numPages ?? pages.length };
}

/**
 * 切塊：以頁為單位累積，超過上限就切一刀。
 * 刻意不跨頁太多，這樣每一條知識都還指得回一個明確的頁碼。
 */
export function chunkPages(pages: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let buffer = "";
  let startPage = 1;

  const flush = () => {
    const text = buffer.trim();
    if (text.length > 80) chunks.push({ page: startPage, text });
    buffer = "";
  };

  pages.forEach((raw, i) => {
    const page = i + 1;
    const clean = (raw ?? "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!clean) return;
    if (buffer.length === 0) startPage = page;
    if (buffer.length + clean.length > CHUNK_CHARS) {
      flush();
      startPage = page;
    }
    buffer += (buffer ? "\n\n" : "") + clean;
  });
  flush();
  return chunks;
}

// 敏感度預判：在送人審之前先自己掃一遍，把可能夾帶高等級資料的條目標出來。
// 這補的是原本最危險的洞——一份被標成 L1 的 FAQ 裡如果貼到客戶名單，
// 系統原本完全不會發現，而 L1 是全隊 12 位 Agent 都讀得到的。
const SENSITIVE_PATTERNS: { flag: string; level: KnowledgeLevel; re: RegExp }[] = [
  { flag: "身分證字號", level: 4, re: /[A-Z][12]\d{8}/ },
  { flag: "電子郵件", level: 3, re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { flag: "電話號碼", level: 3, re: /(09\d{2}[- ]?\d{3}[- ]?\d{3})|(\(?0\d{1,2}\)?[- ]?\d{6,8})/ },
  { flag: "金額／報價", level: 3, re: /(NT\$|新台幣|報價|折扣|成本價|毛利)\s*[\d,]{3,}/ },
  { flag: "合約條款", level: 3, re: /(甲方|乙方|違約金|保密協議|合約期間)/ },
  { flag: "個資字樣", level: 4, re: /(身分證|勞健保|薪資|病歷|個人資料)/ },
];

function scanSensitivity(text: string): { flags: string[]; suggested: KnowledgeLevel } {
  const flags: string[] = [];
  let suggested: KnowledgeLevel = 1;
  for (const p of SENSITIVE_PATTERNS) {
    if (p.re.test(text)) {
      flags.push(p.flag);
      if (p.level > suggested) suggested = p.level;
    }
  }
  return { flags, suggested };
}

const SYSTEM_PROMPT = `你是企業知識庫的內容整理員。使用者會給你一份文件的其中一段原文，請把它整理成可以直接餵給客服／行銷 AI 助理使用的知識條目。

規則：
1. 只根據原文，不要補充原文沒有的資訊。原文沒寫的就不要寫，寧可少一條也不要編。
2. 多數內容整理成「問答」：question 是使用者真的會問的問法（不是標題），answer 要能獨立看懂、不依賴上下文。
3. 但不是所有內容都適合問答——流程步驟用 kind="sop"（answer 寫成有順序的步驟）、單一事實用 "fact"、
   價目或規格表用 "table"（answer 保留欄位對應關係）。
4. 每一條給 level（1 公開資料／2 內部資料／3 敏感資料：客戶、報價、財務、內部策略／4 高敏感：個資、法務、營業秘密）。
   拿不準時往高的給。
5. category 用 2-6 個字的中文短語（例如「退換貨」「報價規則」「課程資訊」）。
6. confidence 0-1，表示這一條有多忠於原文。
7. 目錄、頁碼、版權宣告、空白頁這類沒有知識價值的內容，直接略過不要產生條目。

只回傳 JSON：{"items":[{"question":"","answer":"","kind":"faq","level":1,"category":"","confidence":0.9}]}`;

/** 把一塊原文轉成候選條目（AI 轉換 + 規則式敏感度預判，兩者取較嚴格的等級） */
async function convertChunk(chunk: Chunk): Promise<KbCandidate[]> {
  const data = await chatJson({
    model: "gpt-4o-mini",
    operation: "kb-import-convert",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `這是文件第 ${chunk.page} 頁起的原文：\n\n${chunk.text}` },
    ],
  });

  const items: Record<string, unknown>[] = Array.isArray(data?.items) ? data.items : [];
  return items
    .filter((it) => Boolean(it) && typeof it === "object")
    .map((it): KbCandidate => {
      const question = String(it.question ?? "").trim();
      const answer = String(it.answer ?? "").trim();
      const aiLevel = Math.min(4, Math.max(1, Number(it.level) || 1)) as KnowledgeLevel;
      const scan = scanSensitivity(`${question}\n${answer}`);
      // AI 判的等級與規則掃出來的等級取比較嚴格的那個
      const level = (Math.max(aiLevel, scan.suggested) as KnowledgeLevel) ?? 1;
      const kind = ["faq", "sop", "fact", "table", "doc"].includes(String(it.kind))
        ? (String(it.kind) as KnowledgeKind)
        : "faq";
      return {
        question,
        answer,
        kind,
        level,
        category: String(it.category ?? "未分類").trim() || "未分類",
        page: chunk.page,
        confidence: Math.min(1, Math.max(0, Number(it.confidence) || 0.6)),
        flags: scan.flags,
      } satisfies KbCandidate;
    })
    .filter((c: KbCandidate) => c.question.length > 1 && c.answer.length > 1);
}

export interface ImportResult {
  sourceId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
  processedChunks: number;
  candidateCount: number;
  truncated: boolean;
}

/**
 * 完整跑一次匯入：抽文字 → 存來源 → 切塊 → 轉條目 → 全部存成草稿。
 * 同一份檔案（checksum 相同）重傳會直接回上一次的結果，不會重複匯入。
 */
export async function importPdf(params: {
  buf: Buffer;
  filename: string;
  mimeType?: string;
  uploadedBy?: string;
}): Promise<ImportResult> {
  const supabase = getSupabase();
  const checksum = checksumOf(params.buf);

  const { data: existing } = await supabase
    .from("kb_sources")
    .select("id,filename,page_count,status")
    .eq("checksum", checksum)
    .maybeSingle();
  if (existing?.id) {
    const { count } = await supabase
      .from("knowledge_base")
      .select("id", { count: "exact", head: true })
      .eq("source_doc_id", existing.id);
    return {
      sourceId: existing.id as string,
      filename: existing.filename as string,
      pageCount: (existing.page_count as number) ?? 0,
      chunkCount: 0,
      processedChunks: 0,
      candidateCount: count ?? 0,
      truncated: false,
    };
  }

  const { pages, pageCount } = await extractPdf(params.buf);
  const fullText = pages.join("\n\n");
  if (fullText.trim().length < 40) {
    throw new Error("這份 PDF 抽不到文字，可能是掃描件——需要先做 OCR 才能匯入");
  }

  const { data: source, error: srcError } = await supabase
    .from("kb_sources")
    .insert({
      filename: params.filename,
      mime_type: params.mimeType ?? "application/pdf",
      byte_size: params.buf.length,
      checksum,
      page_count: pageCount,
      char_count: fullText.length,
      status: "converting",
      extracted_text: fullText,
      uploaded_by: params.uploadedBy ?? null,
    })
    .select("id")
    .single();
  if (srcError) throw new Error(srcError.message);
  const sourceId = source.id as string;

  const allChunks = chunkPages(pages);
  const chunks = allChunks.slice(0, MAX_CHUNKS);

  try {
    // 逐塊轉換（序列跑，避免同時打爆 API；一塊失敗就跳過那塊，不整份失敗）
    const candidates: KbCandidate[] = [];
    for (const chunk of chunks) {
      try {
        candidates.push(...(await convertChunk(chunk)));
      } catch {
        /* 這一塊轉不出來就跳過，其他照常 */
      }
    }

    await addKnowledgeDocs(
      candidates.map((c) => ({
        title: c.question,
        content: c.answer,
        category: c.category,
        level: c.level,
        kind: c.kind,
        status: "draft" as const,
        sourceDocId: sourceId,
        sourcePage: c.page,
        meta: { confidence: c.confidence, flags: c.flags, filename: params.filename },
      }))
    );

    await supabase
      .from("kb_sources")
      .update({ status: "reviewing", updated_at: new Date().toISOString() })
      .eq("id", sourceId);

    return {
      sourceId,
      filename: params.filename,
      pageCount,
      chunkCount: allChunks.length,
      processedChunks: chunks.length,
      candidateCount: candidates.length,
      truncated: allChunks.length > chunks.length,
    };
  } catch (err) {
    await supabase
      .from("kb_sources")
      .update({
        status: "failed",
        error_detail: err instanceof Error ? err.message : "unknown",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);
    throw err;
  }
}

export interface KbSourceRow {
  id: string;
  filename: string;
  page_count: number | null;
  status: string;
  created_at: string;
}

export async function listKbSources(limit = 20): Promise<KbSourceRow[]> {
  const { data } = await getSupabase()
    .from("kb_sources")
    .select("id,filename,page_count,status,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as KbSourceRow[];
}
