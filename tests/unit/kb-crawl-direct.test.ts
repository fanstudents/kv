import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMainSupabase: vi.fn(),
  ingestPages: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getMainSupabase: mocks.getMainSupabase }));
vi.mock("@/lib/kb-import", () => ({ ingestPages: mocks.ingestPages }));

import { importUrl, recheckUrlSources } from "@/lib/kb-crawl";

function contentHash(title: string, url: string, markdown: string): string {
  return createHash("sha256")
    .update(`# ${title}\n來源：${url}\n\n${markdown}`)
    .digest("hex");
}

function scrapeResponse(page: { url: string; title: string; markdown: string }): Response {
  return new Response(
    JSON.stringify({
      data: {
        markdown: page.markdown,
        metadata: { title: page.title, sourceURL: page.url },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

const initialFirecrawlApiKey = process.env.FIRECRAWL_API_KEY;

beforeEach(() => {
  mocks.getMainSupabase.mockReset();
  mocks.ingestPages.mockReset();
  process.env.FIRECRAWL_API_KEY = "credential-free-test-key";
});

afterEach(() => {
  if (initialFirecrawlApiKey === undefined) delete process.env.FIRECRAWL_API_KEY;
  else process.env.FIRECRAWL_API_KEY = initialFirecrawlApiKey;
  vi.unstubAllGlobals();
});

describe("kb crawl direct import state transitions", () => {
  it("touches the existing source and skips ingestion when normalized URL content is unchanged", async () => {
    const page = {
      url: "https://example.com/guide",
      title: "Guide",
      markdown: "This is enough source text to be a usable knowledge-base page. ".repeat(2),
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
      update: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({
      data: { id: "source-existing", content_hash: contentHash(page.title, page.url, page.markdown) },
    });
    query.update.mockReturnValue(query);
    const from = vi.fn(() => query);
    mocks.getMainSupabase.mockReturnValue({ from });
    const fetchMock = vi.fn().mockResolvedValue(scrapeResponse(page));
    vi.stubGlobal("fetch", fetchMock);

    await expect(importUrl({ url: "https://example.com/guide/#section", mode: "single" })).resolves.toEqual({
      sourceId: "source-existing",
      url: "https://example.com/guide",
      mode: "single",
      pageCount: 1,
      chunkCount: 0,
      processedChunks: 0,
      candidateCount: 0,
      truncated: false,
      unchanged: true,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.ingestPages).not.toHaveBeenCalled();
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ last_checked_at: expect.any(String) }));
    expect(query.eq).toHaveBeenLastCalledWith("id", "source-existing");
  });

  it("refreshes a changed existing source before it runs the shared ingestion pipeline", async () => {
    const page = {
      url: "https://example.com/guide",
      title: "Updated guide",
      markdown: "The source has materially changed and contains enough text for ingestion. ".repeat(2),
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
      update: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: { id: "source-existing", content_hash: "old-content" } });
    query.update.mockReturnValue(query);
    mocks.getMainSupabase.mockReturnValue({ from: vi.fn(() => query) });
    mocks.ingestPages.mockResolvedValue({
      chunkCount: 2,
      processedChunks: 2,
      candidateCount: 3,
      truncated: false,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(scrapeResponse(page)));

    await expect(importUrl({ url: page.url, mode: "single" })).resolves.toEqual({
      sourceId: "source-existing",
      url: page.url,
      mode: "single",
      pageCount: 1,
      chunkCount: 2,
      processedChunks: 2,
      candidateCount: 3,
      truncated: false,
    });

    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "converting",
        content_hash: contentHash(page.title, page.url, page.markdown),
        extracted_text: `# ${page.title}\n來源：${page.url}\n\n${page.markdown}`,
      }),
    );
    expect(mocks.ingestPages).toHaveBeenCalledWith({
      sourceId: "source-existing",
      pages: [`${page.title}\n\n${page.markdown}`],
      label: page.url,
    });
  });

  it("marks a newly-created source failed when downstream ingestion rejects", async () => {
    const page = {
      url: "https://example.com/new-guide",
      title: "New guide",
      markdown: "This new source contains enough text for the import pipeline to accept it. ".repeat(2),
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
      insert: vi.fn(),
      single: vi.fn(),
      update: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null });
    query.insert.mockReturnValue(query);
    query.single.mockResolvedValue({ data: { id: "source-new" }, error: null });
    query.update.mockReturnValue(query);
    mocks.getMainSupabase.mockReturnValue({ from: vi.fn(() => query) });
    mocks.ingestPages.mockRejectedValue(new Error("conversion unavailable"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(scrapeResponse(page)));

    await expect(importUrl({ url: page.url, mode: "single" })).rejects.toThrow("conversion unavailable");

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "converting", url: page.url, source_type: "url" }),
    );
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", error_detail: "conversion unavailable" }),
    );
    expect(query.eq).toHaveBeenLastCalledWith("id", "source-new");
  });
});

describe("kb crawl direct recheck state transitions", () => {
  it("continues across missing and failed URLs, marks only changed published docs for review", async () => {
    const unchanged = {
      url: "https://example.com/same",
      title: "Same source",
      markdown: "This content is unchanged and remains long enough for a valid scrape. ".repeat(2),
    };
    const sources = [
      { id: "source-changed", url: "https://example.com/changed", content_hash: "old-content" },
      {
        id: "source-same",
        url: unchanged.url,
        content_hash: contentHash(unchanged.title, unchanged.url, unchanged.markdown),
      },
      { id: "source-missing-url", url: null, content_hash: "old-content" },
      { id: "source-broken", url: "https://example.com/broken", content_hash: "old-content" },
    ];
    const sourceEq = vi.fn();
    const sourceQuery = {
      select: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      update: vi.fn(),
    };
    sourceQuery.select.mockReturnValue(sourceQuery);
    sourceQuery.in.mockReturnValue(sourceQuery);
    sourceQuery.order.mockReturnValue(sourceQuery);
    sourceQuery.limit.mockResolvedValue({ data: sources });
    sourceQuery.update.mockReturnValue({ eq: sourceEq });

    const docsEq = vi.fn();
    const docsQuery = { select: vi.fn() };
    docsQuery.select.mockReturnValue({ eq: docsEq });
    docsEq.mockReturnValueOnce({ eq: docsEq }).mockResolvedValueOnce({ data: [{ id: "doc-1" }, { id: "doc-2" }] });
    const markDocsForReview = vi.fn(() => ({ in: vi.fn() }));
    const activityInsert = vi.fn();
    const from = vi.fn((table: string) => {
      if (table === "kb_sources") return sourceQuery;
      if (table === "knowledge_base") {
        return { ...docsQuery, update: markDocsForReview };
      }
      if (table === "line_agent_activity") return { insert: activityInsert };
      throw new Error(`unexpected table ${table}`);
    });
    mocks.getMainSupabase.mockReturnValue({ from });

    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { url: string };
      if (body.url === "https://example.com/broken") throw new Error("temporary scrape failure");
      if (body.url === unchanged.url) return scrapeResponse(unchanged);
      return scrapeResponse({
        url: body.url,
        title: "Changed source",
        markdown: "This source has been updated and should trigger a human review. ".repeat(2),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(recheckUrlSources(10)).resolves.toEqual({
      checked: 2,
      changed: [{ sourceId: "source-changed", url: "https://example.com/changed", staleDocs: 2 }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sourceQuery.update).toHaveBeenCalledTimes(2);
    expect(markDocsForReview).toHaveBeenCalledWith(
      expect.objectContaining({ review_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    );
    expect(activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agent_slug: "operations", status: "pending" }),
    );
  });
});
