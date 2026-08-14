import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getCreditUsage } from "@/adapters/knowledge-base/firecrawl-client";
import { listKnowledgeDocs, publishKnowledgeDocs } from "@/adapters/knowledge-base/supabase-knowledge-store";
import { importUrl } from "@/lib/kb-crawl";
import { searchKnowledge } from "@/lib/kb-search";
import { getMainSupabase } from "@/lib/supabase";
import { requireStagingMainDatabaseEnvironment } from "../integration/staging-main-db";

const GATE = "KB_STAGING_ACCEPTANCE";
const COMMAND = "npm run acceptance:kb";
const MAX_FIRECRAWL_CREDITS = 1;
const ALLOWED_HOST = "raw.githubusercontent.com";
const ALLOWED_PATH_PREFIX = "/fanstudents/kv/";

let acceptanceUrl: string | null = null;
let sourceId: string | null = null;

function requireAcceptanceUrl(): string {
  if (process.env[GATE] !== "1") {
    throw new Error(`${GATE} is opt-in. Set ${GATE}=1 before running ${COMMAND}.`);
  }
  requireStagingMainDatabaseEnvironment(GATE, COMMAND);

  if (!process.env.FIRECRAWL_API_KEY || !process.env.OPENAI_API_KEY) {
    throw new Error("KB acceptance requires server-only Firecrawl and OpenAI API keys; no provider calls were made.");
  }
  if (Number(process.env.KB_ACCEPTANCE_MAX_FIRECRAWL_CREDITS) !== MAX_FIRECRAWL_CREDITS) {
    throw new Error("KB_ACCEPTANCE_MAX_FIRECRAWL_CREDITS must be exactly 1; no provider calls were made.");
  }

  let url: URL;
  try {
    url = new URL(process.env.KB_ACCEPTANCE_URL ?? "");
  } catch {
    throw new Error("KB_ACCEPTANCE_URL must be an allowlisted public KV source; no provider calls were made.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== ALLOWED_HOST ||
    !url.pathname.startsWith(ALLOWED_PATH_PREFIX)
  ) {
    throw new Error("KB_ACCEPTANCE_URL must point to the public fanstudents/kv repository; no provider calls were made.");
  }

  url.searchParams.set("codex-kb-acceptance", String(Date.now()));
  return url.toString();
}

afterAll(async () => {
  if (!acceptanceUrl) return;

  const client = getMainSupabase();
  const { data: sources, error: sourceLookupError } = await client
    .from("kb_sources")
    .select("id")
    .eq("url", acceptanceUrl);
  if (sourceLookupError) throw new Error(`KB acceptance source lookup failed: ${sourceLookupError.message}`);

  const sourceIds = (sources ?? []).map((row) => row.id);
  if (sourceId && !sourceIds.includes(sourceId)) sourceIds.push(sourceId);
  if (sourceIds.length === 0) return;

  const { data: docs, error: docsLookupError } = await client
    .from("knowledge_base")
    .select("id")
    .in("source_doc_id", sourceIds);
  if (docsLookupError) throw new Error(`KB acceptance document lookup failed: ${docsLookupError.message}`);

  const docIds = (docs ?? []).map((row) => row.id);
  if (docIds.length > 0) {
    const chunksCleanup = await client.from("kb_chunks").delete().in("doc_id", docIds);
    if (chunksCleanup.error) throw new Error(`KB acceptance chunk cleanup failed: ${chunksCleanup.error.message}`);

    const docsCleanup = await client.from("knowledge_base").delete().in("id", docIds);
    if (docsCleanup.error) throw new Error(`KB acceptance document cleanup failed: ${docsCleanup.error.message}`);
  }

  const sourcesCleanup = await client.from("kb_sources").delete().in("id", sourceIds);
  if (sourcesCleanup.error) throw new Error(`KB acceptance source cleanup failed: ${sourcesCleanup.error.message}`);
});

beforeAll(() => {
  acceptanceUrl = requireAcceptanceUrl();
});

describe.sequential("controlled Knowledge Base provider acceptance", () => {
  it("scrapes one KV page, creates drafts, publishes, indexes, searches, and stays within one credit", async () => {
    const creditBefore = await getCreditUsage();
    expect(creditBefore).not.toBeNull();
    expect(creditBefore?.remaining ?? 0).toBeGreaterThan(0);

    const imported = await importUrl({ url: acceptanceUrl!, mode: "single", limit: 1 });
    sourceId = imported.sourceId;
    expect(imported.pageCount).toBe(1);
    expect(imported.processedChunks).toBeGreaterThan(0);
    expect(imported.candidateCount).toBeGreaterThan(0);

    const drafts = await listKnowledgeDocs({ status: "draft", sourceDocId: sourceId });
    expect(drafts.length).toBe(imported.candidateCount);

    const docIds = drafts.map((doc) => doc.id);
    await expect(publishKnowledgeDocs(docIds)).resolves.toBe(docIds.length);

    const { count: chunkCount, error: chunkError } = await getMainSupabase()
      .from("kb_chunks")
      .select("id", { count: "exact", head: true })
      .in("doc_id", docIds);
    expect(chunkError).toBeNull();
    expect(chunkCount ?? 0).toBeGreaterThan(0);

    const hits = await searchKnowledge({
      question: "KV 專案目前如何進行產品化與驗證？",
      maxLevel: 4,
      limit: 6,
      minSimilarity: 0,
    });
    expect(hits.some((hit) => docIds.includes(hit.docId))).toBe(true);

    const creditAfter = await getCreditUsage();
    expect(creditAfter).not.toBeNull();
    const usedCredits = (creditBefore?.remaining ?? 0) - (creditAfter?.remaining ?? 0);
    expect(usedCredits).toBeGreaterThanOrEqual(0);
    expect(usedCredits).toBeLessThanOrEqual(MAX_FIRECRAWL_CREDITS);
  });
});
