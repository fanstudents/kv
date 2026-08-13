import "server-only";
import { createHash } from "node:crypto";
import { crawlSite, scrapeUrl } from "@/adapters/knowledge-base/firecrawl-client";
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

  const { data: existing, error: existingError } = await supabase
    .from("kb_sources")
    .select("id,content_hash")
    .eq("checksum", checksum)
    .maybeSingle();
  if (existingError) throw new Error(`Knowledge source lookup failed: ${existingError.message}`);

  if (existing?.id && existing.content_hash === contentHash) {
    const { error } = await supabase.from("kb_sources").update({ last_checked_at: now }).eq("id", existing.id);
    if (error) throw new Error(`Knowledge source check-in failed: ${error.message}`);
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
    const { error } = await supabase
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
    if (error) throw new Error(`Knowledge source refresh failed: ${error.message}`);
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
    const { error: failureStatusError } = await supabase
      .from("kb_sources")
      .update({
        status: "failed",
        error_detail: err instanceof Error ? err.message : "unknown",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);
    if (failureStatusError) {
      console.error("[knowledge-base] failed to persist source failure status", failureStatusError.message);
    }
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
  const { data: sources, error: sourcesError } = await supabase
    .from("kb_sources")
    .select("id,url,source_type,content_hash")
    .in("source_type", ["url", "site"])
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (sourcesError) throw new Error(`Knowledge source recheck list failed: ${sourcesError.message}`);

  const result: RecheckResult = { checked: 0, changed: [] };

  for (const src of sources ?? []) {
    if (!src.url) continue;
    try {
      const page = await scrapeUrl(src.url as string);
      const now = new Date().toISOString();
      // 單頁比對正文；整站來源這裡只比首頁，變了就值得整份重看
      const nextHash = hash(`# ${page.title}\n來源：${page.url}\n\n${page.markdown}`);
      const changed = Boolean(src.content_hash) && src.content_hash !== nextHash;

      const { error: checkInError } = await supabase
        .from("kb_sources")
        .update({ last_checked_at: now })
        .eq("id", src.id);
      if (checkInError) throw new Error(`Knowledge source check-in failed: ${checkInError.message}`);
      if (!changed) {
        result.checked += 1;
        continue;
      }

      const { data: docs, error: docsError } = await supabase
        .from("knowledge_base")
        .select("id")
        .eq("source_doc_id", src.id)
        .eq("status", "published");
      if (docsError) throw new Error(`Knowledge source document lookup failed: ${docsError.message}`);
      const ids = (docs ?? []).map((d) => d.id as string);
      if (ids.length > 0) {
        const { error: reviewError } = await supabase
          .from("knowledge_base")
          .update({ review_at: now.slice(0, 10), updated_at: now })
          .in("id", ids);
        if (reviewError) throw new Error(`Knowledge source review mark failed: ${reviewError.message}`);
      }
      const { error: activityError } = await supabase.from("line_agent_activity").insert({
        agent_slug: "operations",
        summary: `知識來源已更新：${src.url}——${ids.length} 條相關知識已標記待複檢`,
        status: "pending",
      });
      if (activityError) throw new Error(`Knowledge source activity write failed: ${activityError.message}`);
      result.checked += 1;
      result.changed.push({ sourceId: src.id as string, url: src.url as string, staleDocs: ids.length });
    } catch (error) {
      // 單一來源失敗不影響其他，但不能把失敗來源算成 checked／changed 成功。
      console.warn(
        `[knowledge-base] source recheck skipped (${src.id}): ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }
  return result;
}
