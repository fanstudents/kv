import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkInUrlSource: vi.fn(),
  createUrlSource: vi.fn(),
  findUrlSourceByChecksum: vi.fn(),
  getMainSupabase: vi.fn(),
  ingestPages: vi.fn(),
  listUrlSourcesForRecheck: vi.fn(),
  markUrlSourceFailed: vi.fn(),
  refreshUrlSource: vi.fn(),
}));

vi.mock("@/adapters/knowledge-base/supabase-knowledge-source-store", () => ({
  checkInUrlSource: mocks.checkInUrlSource,
  createUrlSource: mocks.createUrlSource,
  findUrlSourceByChecksum: mocks.findUrlSourceByChecksum,
  listUrlSourcesForRecheck: mocks.listUrlSourcesForRecheck,
  markUrlSourceFailed: mocks.markUrlSourceFailed,
  refreshUrlSource: mocks.refreshUrlSource,
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
  mocks.checkInUrlSource.mockReset();
  mocks.createUrlSource.mockReset();
  mocks.findUrlSourceByChecksum.mockReset();
  mocks.getMainSupabase.mockReset();
  mocks.ingestPages.mockReset();
  mocks.listUrlSourcesForRecheck.mockReset();
  mocks.markUrlSourceFailed.mockReset();
  mocks.refreshUrlSource.mockReset();
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
    mocks.findUrlSourceByChecksum.mockResolvedValue({
      id: "source-existing",
      contentHash: contentHash(page.title, page.url, page.markdown),
    });
    mocks.checkInUrlSource.mockResolvedValue(undefined);
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
    expect(mocks.checkInUrlSource).toHaveBeenCalledWith("source-existing", expect.any(String));
  });

  it("refreshes a changed existing source before it runs the shared ingestion pipeline", async () => {
    const page = {
      url: "https://example.com/guide",
      title: "Updated guide",
      markdown: "The source has materially changed and contains enough text for ingestion. ".repeat(2),
    };
    mocks.findUrlSourceByChecksum.mockResolvedValue({ id: "source-existing", contentHash: "old-content" });
    mocks.refreshUrlSource.mockResolvedValue(undefined);
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

    expect(mocks.refreshUrlSource).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "source-existing",
        pageCount: 1,
        charCount: expect.any(Number),
        contentHash: contentHash(page.title, page.url, page.markdown),
        extractedText: `# ${page.title}\n來源：${page.url}\n\n${page.markdown}`,
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
    mocks.findUrlSourceByChecksum.mockResolvedValue(null);
    mocks.createUrlSource.mockResolvedValue("source-new");
    mocks.markUrlSourceFailed.mockResolvedValue(undefined);
    mocks.ingestPages.mockRejectedValue(new Error("conversion unavailable"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(scrapeResponse(page)));

    await expect(importUrl({ url: page.url, mode: "single" })).rejects.toThrow("conversion unavailable");

    expect(mocks.createUrlSource).toHaveBeenCalledWith(
      expect.objectContaining({ sourceType: "url", url: page.url, contentHash: expect.any(String) }),
    );
    expect(mocks.markUrlSourceFailed).toHaveBeenCalledWith("source-new", "conversion unavailable", expect.any(String));
  });

  it("does not claim an unchanged source was checked when the check-in write fails", async () => {
    const page = {
      url: "https://example.com/guide",
      title: "Guide",
      markdown: "This is enough source text to be a usable knowledge-base page. ".repeat(2),
    };
    mocks.findUrlSourceByChecksum.mockResolvedValue({
      id: "source-existing",
      contentHash: contentHash(page.title, page.url, page.markdown),
    });
    mocks.checkInUrlSource.mockRejectedValue(new Error("Knowledge source check-in failed: database unavailable"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(scrapeResponse(page)));

    await expect(importUrl({ url: page.url, mode: "single" })).rejects.toThrow(
      "Knowledge source check-in failed: database unavailable",
    );
    expect(mocks.ingestPages).not.toHaveBeenCalled();
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
      { id: "source-changed", url: "https://example.com/changed", contentHash: "old-content", sourceType: "url" },
      {
        id: "source-same",
        url: unchanged.url,
        contentHash: contentHash(unchanged.title, unchanged.url, unchanged.markdown),
        sourceType: "url",
      },
      { id: "source-missing-url", url: null, contentHash: "old-content", sourceType: "url" },
      { id: "source-broken", url: "https://example.com/broken", contentHash: "old-content", sourceType: "url" },
    ];
    mocks.listUrlSourcesForRecheck.mockResolvedValue(sources);
    mocks.checkInUrlSource.mockResolvedValue(undefined);

    const docsEq = vi.fn();
    const docsQuery = { select: vi.fn() };
    docsQuery.select.mockReturnValue({ eq: docsEq });
    docsEq.mockReturnValueOnce({ eq: docsEq }).mockResolvedValueOnce({ data: [{ id: "doc-1" }, { id: "doc-2" }], error: null });
    const markDocsForReviewIn = vi.fn().mockResolvedValue({ data: null, error: null });
    const markDocsForReview = vi.fn(() => ({ in: markDocsForReviewIn }));
    const activityInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn((table: string) => {
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
    expect(mocks.checkInUrlSource).toHaveBeenCalledTimes(2);
    expect(markDocsForReview).toHaveBeenCalledWith(
      expect.objectContaining({ review_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    );
    expect(activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({ agent_slug: "operations", status: "pending" }),
    );
  });
});
