import "server-only";

import { getMainSupabase } from "@/lib/supabase";

/**
 * Supabase persistence boundary for URL／site knowledge sources.
 *
 * Firecrawl transport and content hashing stay in `kb-crawl.ts`; this store
 * owns only `kb_sources` row lookup and state transitions for that journey.
 * PDF source persistence remains transitional in `kb-import.ts` until its
 * own real journey is touched.
 */

export interface UrlSourceIdentity {
  id: string;
  contentHash: string | null;
}

export interface UrlSourceRecheckRow {
  id: string;
  url: string | null;
  sourceType: string;
  contentHash: string | null;
}

export async function findUrlSourceByChecksum(checksum: string): Promise<UrlSourceIdentity | null> {
  const { data, error } = await getMainSupabase()
    .from("kb_sources")
    .select("id,content_hash")
    .eq("checksum", checksum)
    .maybeSingle();
  if (error) throw new Error(`Knowledge source lookup failed: ${error.message}`);
  if (!data) return null;
  return { id: data.id as string, contentHash: (data.content_hash as string | null) ?? null };
}

export async function checkInUrlSource(sourceId: string, lastCheckedAt: string): Promise<void> {
  const { error } = await getMainSupabase()
    .from("kb_sources")
    .update({ last_checked_at: lastCheckedAt })
    .eq("id", sourceId);
  if (error) throw new Error(`Knowledge source check-in failed: ${error.message}`);
}

export async function refreshUrlSource(params: {
  sourceId: string;
  pageCount: number;
  charCount: number;
  extractedText: string;
  contentHash: string;
  lastCheckedAt: string;
  updatedAt: string;
}): Promise<void> {
  const { error } = await getMainSupabase()
    .from("kb_sources")
    .update({
      page_count: params.pageCount,
      char_count: params.charCount,
      status: "converting",
      extracted_text: params.extractedText,
      content_hash: params.contentHash,
      last_checked_at: params.lastCheckedAt,
      updated_at: params.updatedAt,
    })
    .eq("id", params.sourceId);
  if (error) throw new Error(`Knowledge source refresh failed: ${error.message}`);
}

export async function createUrlSource(params: {
  filename: string;
  sourceType: "url" | "site";
  url: string;
  byteSize: number;
  checksum: string;
  contentHash: string;
  pageCount: number;
  charCount: number;
  extractedText: string;
  lastCheckedAt: string;
}): Promise<string> {
  const { data, error } = await getMainSupabase()
    .from("kb_sources")
    .insert({
      filename: params.filename,
      source_type: params.sourceType,
      url: params.url,
      mime_type: "text/markdown",
      byte_size: params.byteSize,
      checksum: params.checksum,
      content_hash: params.contentHash,
      page_count: params.pageCount,
      char_count: params.charCount,
      status: "converting",
      extracted_text: params.extractedText,
      last_checked_at: params.lastCheckedAt,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function markUrlSourceFailed(sourceId: string, errorDetail: string, updatedAt: string): Promise<void> {
  const { error } = await getMainSupabase()
    .from("kb_sources")
    .update({ status: "failed", error_detail: errorDetail, updated_at: updatedAt })
    .eq("id", sourceId);
  if (error) throw new Error(error.message);
}

export async function listUrlSourcesForRecheck(limit: number): Promise<UrlSourceRecheckRow[]> {
  const { data, error } = await getMainSupabase()
    .from("kb_sources")
    .select("id,url,source_type,content_hash")
    .in("source_type", ["url", "site"])
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(`Knowledge source recheck list failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    url: (row.url as string | null) ?? null,
    sourceType: row.source_type as string,
    contentHash: (row.content_hash as string | null) ?? null,
  }));
}
