import "server-only";
import { createHash } from "node:crypto";
import { getMainSupabase } from "@/lib/supabase";
import { ingestPages } from "@/lib/kb-import";

// 網站 → 知識庫：用 Firecrawl 把網頁抓成乾淨的 markdown，接上跟 PDF 完全相同的下游
// （切塊 → AI 轉條目 → 敏感度預判 → 草稿 → 人審 → 發布）。
//
// 為什麼是 Firecrawl 而不是自己 fetch：課程頁、官網這類站台多半是前端渲染的，
// 直接抓 HTML 只會拿到空殼；而且它會把導覽列、頁尾、廣告去掉，只留正文。
//
// 兩種模式：
//   single 單頁——最常用，一篇文章／一個服務說明頁進知識庫
//   site   整站——先用 /map 看有幾頁再決定要不要爬，避免一次燒掉大量額度
//
// 另外每一筆來源都記 content_hash，之後重爬比對就知道網站改了沒有（新鮮度）。

const API_BASE = process.env.FIRECRAWL_API_BASE ?? "https://api.firecrawl.dev/v2";

function apiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("尚未設定 FIRECRAWL_API_KEY，無法從網址匯入");
  return key;
}

/** 額度／限流用完時丟這個，上層可以據此給使用者看得懂的說明而不是 HTTP 代碼 */
export class FirecrawlQuotaError extends Error {
  constructor(
    message: string,
    readonly kind: "credits" | "rate-limit" | "auth"
  ) {
    super(message);
    this.name = "FirecrawlQuotaError";
  }
}

async function firecrawl<T>(
  path: string,
  body?: Record<string, unknown>,
  method: "GET" | "POST" = "POST",
  retry = true
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) return data as T;

  // 額度用完（402）與限流（429）要分開處理：前者要等下個計費週期或加值，
  // 後者只是打太快，等一下就好——所以 429 自動重試一次。
  if (res.status === 402) {
    throw new FirecrawlQuotaError(
      "Firecrawl 本期額度已用完，無法再抓取網頁。可以等下一個計費週期，或到 Firecrawl 後台加值；PDF 匯入不受影響。",
      "credits"
    );
  }
  if (res.status === 429) {
    const wait = Number(res.headers.get("retry-after")) || 8;
    if (retry) {
      await new Promise((r) => setTimeout(r, Math.min(wait, 20) * 1000));
      return firecrawl<T>(path, body, method, false);
    }
    throw new FirecrawlQuotaError("Firecrawl 請求太密集（同時最多 2 個任務），請稍後再試一次。", "rate-limit");
  }
  if (res.status === 401 || res.status === 403) {
    throw new FirecrawlQuotaError("Firecrawl API key 無效或已被撤銷，請更新 FIRECRAWL_API_KEY。", "auth");
  }

  const detail = typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
  throw new Error(`Firecrawl 失敗：${detail}`);
}

export interface CreditUsage {
  remaining: number;
  plan: number;
  periodEnd: string | null;
}

/** 查目前剩餘額度（抓取前的預檢與畫面上的提示都用這個） */
export async function getCreditUsage(): Promise<CreditUsage | null> {
  try {
    const data = await firecrawl<{
      data?: { remainingCredits?: number; planCredits?: number; billingPeriodEnd?: string };
    }>("/team/credit-usage", undefined, "GET");
    return {
      remaining: Number(data.data?.remainingCredits ?? 0),
      plan: Number(data.data?.planCredits ?? 0),
      periodEnd: data.data?.billingPeriodEnd ?? null,
    };
  } catch {
    return null;
  }
}

export interface CrawledPage {
  url: string;
  title: string;
  markdown: string;
}

/** 抓單一頁 */
export async function scrapeUrl(url: string): Promise<CrawledPage> {
  const data = await firecrawl<{
    data?: { markdown?: string; metadata?: { title?: string; sourceURL?: string } };
  }>("/scrape", { url, formats: ["markdown"], onlyMainContent: true });
  return {
    url: data.data?.metadata?.sourceURL ?? url,
    title: data.data?.metadata?.title ?? url,
    markdown: data.data?.markdown ?? "",
  };
}

/** 先看看這個站有哪些頁（爬之前的成本預覽，不會真的抓內容） */
export async function mapSite(url: string, limit = 100): Promise<{ url: string; title?: string }[]> {
  const data = await firecrawl<{ links?: { url: string; title?: string }[] }>("/map", { url, limit });
  return data.links ?? [];
}

/** 整站爬：非同步任務，這裡輪詢到完成為止（有時間上限，逾時就用已完成的部分） */
export async function crawlSite(url: string, limit = 25): Promise<CrawledPage[]> {
  // 抓之前先看額度夠不夠——與其爬到一半 402 中斷、留下半份知識，不如一開始就講清楚
  const credit = await getCreditUsage();
  if (credit && credit.remaining < limit) {
    throw new FirecrawlQuotaError(
      `Firecrawl 剩餘額度 ${credit.remaining}，不足以抓 ${limit} 頁。請調低頁數上限，或等下一個計費週期。`,
      "credits"
    );
  }

  const start = await firecrawl<{ id?: string }>("/crawl", {
    url,
    limit,
    scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
  });
  if (!start.id) throw new Error("Firecrawl 沒有回傳任務編號");

  const deadline = Date.now() + 200_000; // 留一點餘裕給後面的 AI 轉換
  let pages: CrawledPage[] = [];

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await firecrawl<{
      status?: string;
      data?: { markdown?: string; metadata?: { title?: string; sourceURL?: string } }[];
    }>(`/crawl/${start.id}`, undefined, "GET");

    pages = (status.data ?? []).map((d) => ({
      url: d.metadata?.sourceURL ?? url,
      title: d.metadata?.title ?? "",
      markdown: d.markdown ?? "",
    }));
    if (status.status === "completed") break;
  }
  return pages.filter((p) => p.markdown.trim().length > 0);
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** 網址正規化：去掉 hash 與結尾斜線，同一頁不會因為寫法不同被當成兩份來源 */
function normalizeUrl(raw: string): string {
  const u = new URL(raw);
  u.hash = "";
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
  return u.toString();
}

export interface UrlImportResult {
  sourceId: string;
  url: string;
  mode: "single" | "site";
  pageCount: number;
  chunkCount: number;
  processedChunks: number;
  candidateCount: number;
  truncated: boolean;
  /** 這個網址先前就匯入過、內容也沒變（不會重複產生條目） */
  unchanged?: boolean;
}

/** 從網址匯入：抓頁面 → 存來源 → 走跟 PDF 一樣的下游（切塊、轉條目、存草稿） */
export async function importUrl(params: {
  url: string;
  mode: "single" | "site";
  limit?: number;
}): Promise<UrlImportResult> {
  const supabase = getMainSupabase();
  const url = normalizeUrl(params.url);
  // 來源身分＝網址本身（不是內容），這樣重爬時可以更新同一筆而不是長出新的
  const checksum = hash(`${params.mode}:${url}`);

  const pages =
    params.mode === "site" ? await crawlSite(url, params.limit ?? 25) : [await scrapeUrl(url)];
  const usable = pages.filter((p) => p.markdown.trim().length > 40);
  if (usable.length === 0) {
    throw new Error("這個網址抓不到正文內容——可能需要登入、或整頁都是圖片");
  }

  const fullText = usable.map((p) => `# ${p.title}\n來源：${p.url}\n\n${p.markdown}`).join("\n\n---\n\n");
  const contentHash = hash(fullText);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("kb_sources")
    .select("id,content_hash")
    .eq("checksum", checksum)
    .maybeSingle();

  if (existing?.id && existing.content_hash === contentHash) {
    await supabase.from("kb_sources").update({ last_checked_at: now }).eq("id", existing.id);
    return {
      sourceId: existing.id as string,
      url,
      mode: params.mode,
      pageCount: usable.length,
      chunkCount: 0,
      processedChunks: 0,
      candidateCount: 0,
      truncated: false,
      unchanged: true,
    };
  }

  let sourceId: string;
  if (existing?.id) {
    sourceId = existing.id as string;
    await supabase
      .from("kb_sources")
      .update({
        page_count: usable.length,
        char_count: fullText.length,
        status: "converting",
        extracted_text: fullText,
        content_hash: contentHash,
        last_checked_at: now,
        updated_at: now,
      })
      .eq("id", sourceId);
  } else {
    const { data, error } = await supabase
      .from("kb_sources")
      .insert({
        filename: usable[0].title || url,
        source_type: params.mode === "site" ? "site" : "url",
        url,
        mime_type: "text/markdown",
        byte_size: fullText.length,
        checksum,
        content_hash: contentHash,
        page_count: usable.length,
        char_count: fullText.length,
        status: "converting",
        extracted_text: fullText,
        last_checked_at: now,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    sourceId = data.id as string;
  }

  try {
    const ingested = await ingestPages({
      sourceId,
      pages: usable.map((p) => `${p.title}\n\n${p.markdown}`),
      label: url,
    });
    return { sourceId, url, mode: params.mode, pageCount: usable.length, ...ingested };
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

export interface RecheckResult {
  checked: number;
  changed: { sourceId: string; url: string; staleDocs: number }[];
}

/**
 * 定期重爬所有網址來源，比對內容雜湊。
 * 內容變了不會偷偷改寫既有條目——而是把該來源的條目標成「待複檢」並記一筆動態，
 * 由人決定要不要重新匯入。網站改了、知識庫自己知道，這是原本缺的新鮮度機制。
 */
export async function recheckUrlSources(limit = 10): Promise<RecheckResult> {
  const supabase = getMainSupabase();
  const { data: sources } = await supabase
    .from("kb_sources")
    .select("id,url,source_type,content_hash")
    .in("source_type", ["url", "site"])
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  const result: RecheckResult = { checked: 0, changed: [] };

  for (const src of sources ?? []) {
    if (!src.url) continue;
    try {
      const page = await scrapeUrl(src.url as string);
      const now = new Date().toISOString();
      result.checked += 1;
      // 單頁比對正文；整站來源這裡只比首頁，變了就值得整份重看
      const nextHash = hash(`# ${page.title}\n來源：${page.url}\n\n${page.markdown}`);
      const changed = Boolean(src.content_hash) && src.content_hash !== nextHash;

      await supabase.from("kb_sources").update({ last_checked_at: now }).eq("id", src.id);
      if (!changed) continue;

      const { data: docs } = await supabase
        .from("knowledge_base")
        .select("id")
        .eq("source_doc_id", src.id)
        .eq("status", "published");
      const ids = (docs ?? []).map((d) => d.id as string);
      if (ids.length > 0) {
        await supabase
          .from("knowledge_base")
          .update({ review_at: now.slice(0, 10), updated_at: now })
          .in("id", ids);
      }
      await supabase.from("line_agent_activity").insert({
        agent_slug: "operations",
        summary: `知識來源已更新：${src.url}——${ids.length} 條相關知識已標記待複檢`,
        status: "pending",
      });
      result.changed.push({ sourceId: src.id as string, url: src.url as string, staleDocs: ids.length });
    } catch {
      /* 單一來源抓不到就跳過，不影響其他 */
    }
  }
  return result;
}
