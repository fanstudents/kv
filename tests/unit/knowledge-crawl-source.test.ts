import { describe, expect, it, vi } from "vitest";
import {
  KNOWLEDGE_SOURCE_RECHECK_LIMIT,
  importKnowledgeFromUrl,
  parseKnowledgeCrawlImport,
  parseKnowledgeCrawlPreview,
  parseKnowledgeCrawlRecheckAuth,
  previewKnowledgeCrawl,
  recheckKnowledgeSources,
  type KnowledgeCrawlProvider,
} from "@/modules/knowledge-base/crawl-source";

describe("knowledge crawl rules", () => {
  it("uses the credit branch when no URL is supplied", () => {
    expect(parseKnowledgeCrawlPreview(null)).toEqual({ kind: "credit" });
  });

  it("accepts HTTP(S) and preserves the raw preview URL", () => {
    expect(parseKnowledgeCrawlPreview("https://example.com/path#section")).toEqual({
      kind: "site",
      url: "https://example.com/path#section",
    });
  });

  it("rejects non-HTTP preview protocols with the existing message", () => {
    expect(parseKnowledgeCrawlPreview("ftp://example.com")).toEqual({
      kind: "invalid",
      message: "請提供有效的網址",
    });
  });

  it("trims a single-page URL and applies the existing default limit", () => {
    expect(parseKnowledgeCrawlImport({ url: "  https://example.com/page  " })).toEqual({
      kind: "valid",
      input: { url: "https://example.com/page", mode: "single", limit: 25 },
    });
  });

  it("preserves site mode and clamps the page limit to 1..60", () => {
    expect(parseKnowledgeCrawlImport({ url: "https://example.com", mode: "site", limit: 999 })).toEqual({
      kind: "valid",
      input: { url: "https://example.com", mode: "site", limit: 60 },
    });
    expect(parseKnowledgeCrawlImport({ url: "https://example.com", mode: "site", limit: -4 })).toEqual({
      kind: "valid",
      input: { url: "https://example.com", mode: "site", limit: 1 },
    });
  });

  it("rejects missing and non-HTTP(S) import URLs with the existing message", () => {
    expect(parseKnowledgeCrawlImport({})).toEqual({
      kind: "invalid",
      message: "請提供有效的網址（http/https）",
    });
    expect(parseKnowledgeCrawlImport({ url: "ftp://example.com" })).toEqual({
      kind: "invalid",
      message: "請提供有效的網址（http/https）",
    });
  });

  it("fails closed when CRON_SECRET is missing", () => {
    expect(parseKnowledgeCrawlRecheckAuth(undefined, "anything")).toEqual({
      kind: "misconfigured",
      message: "server misconfigured: CRON_SECRET not set",
      status: 503,
    });
    expect(parseKnowledgeCrawlRecheckAuth("", "anything")).toEqual({
      kind: "misconfigured",
      message: "server misconfigured: CRON_SECRET not set",
      status: 503,
    });
  });

  it("rejects missing or mismatched cron headers", () => {
    expect(parseKnowledgeCrawlRecheckAuth("expected", null)).toEqual({
      kind: "unauthorized",
      message: "unauthorized",
      status: 401,
    });
    expect(parseKnowledgeCrawlRecheckAuth("expected", "other")).toEqual({
      kind: "unauthorized",
      message: "unauthorized",
      status: 401,
    });
  });

  it("accepts the exact configured cron secret", () => {
    expect(parseKnowledgeCrawlRecheckAuth("expected", "expected")).toEqual({ kind: "authorized" });
  });
});

describe("knowledge crawl use cases", () => {
  it("returns only credit usage for the credit branch", async () => {
    const credit = { remaining: 10, plan: 100, periodEnd: "tomorrow" };
    const getCreditUsage = vi.fn(async () => credit);

    await expect(
      previewKnowledgeCrawl({ kind: "credit" }, { getCreditUsage } as never),
    ).resolves.toEqual({ credit });
    expect(getCreditUsage).toHaveBeenCalledOnce();
  });

  it("maps site links with a count and keeps only the first 30", async () => {
    const links = Array.from({ length: 35 }, (_, index) => ({ url: `https://example.com/${index}` }));
    const mapSite = vi.fn(async () => links);
    const getCreditUsage = vi.fn(async () => null);

    await expect(
      previewKnowledgeCrawl(
        { kind: "site", url: "https://example.com" },
        { mapSite, getCreditUsage } as never,
      ),
    ).resolves.toEqual({ count: 35, links: links.slice(0, 30), credit: null });
    expect(mapSite).toHaveBeenCalledWith("https://example.com", 200);
    expect(getCreditUsage).toHaveBeenCalledOnce();
  });

  it("imports first, then returns drafts and current credit usage", async () => {
    const provider: KnowledgeCrawlProvider = {
      importUrl: vi.fn().mockResolvedValue({
        sourceId: "source-1",
        url: "https://example.com",
        mode: "site",
        pageCount: 2,
        chunkCount: 3,
        processedChunks: 3,
        candidateCount: 2,
        truncated: false,
      }),
      listDrafts: vi.fn().mockResolvedValue([{ id: "doc-1", title: "Draft" }]),
      getCreditUsage: vi.fn().mockResolvedValue({ remaining: 8, plan: 20, periodEnd: null }),
      mapSite: vi.fn(),
      recheckUrlSources: vi.fn(),
      isQuotaError: vi.fn(),
    };

    await expect(
      importKnowledgeFromUrl({ url: "https://example.com", mode: "site", limit: 10 }, provider),
    ).resolves.toEqual({
      sourceId: "source-1",
      url: "https://example.com",
      mode: "site",
      pageCount: 2,
      chunkCount: 3,
      processedChunks: 3,
      candidateCount: 2,
      truncated: false,
      docs: [{ id: "doc-1", title: "Draft" }],
      credit: { remaining: 8, plan: 20, periodEnd: null },
    });
    expect(provider.importUrl).toHaveBeenCalledWith({ url: "https://example.com", mode: "site", limit: 10 });
    expect(provider.listDrafts).toHaveBeenCalledWith("source-1");
    expect(provider.getCreditUsage).toHaveBeenCalledOnce();
  });

  it("preserves an unchanged import result", async () => {
    const provider = {
      importUrl: vi.fn().mockResolvedValue({
        sourceId: "source-2",
        url: "https://example.com/page",
        mode: "single",
        pageCount: 1,
        chunkCount: 0,
        processedChunks: 0,
        candidateCount: 0,
        truncated: false,
        unchanged: true,
      }),
      listDrafts: vi.fn().mockResolvedValue([]),
      getCreditUsage: vi.fn().mockResolvedValue(null),
    };
    await expect(
      importKnowledgeFromUrl(
        { url: "https://example.com/page", mode: "single", limit: 25 },
        provider as never,
      ),
    ).resolves.toMatchObject({ unchanged: true, docs: [], credit: null });
  });

  it("keeps the fixed ten-source recheck limit and response envelope", async () => {
    const recheckUrlSources = vi.fn().mockResolvedValue({
      checked: 2,
      changed: [{ sourceId: "source-1", url: "https://example.com", staleDocs: 3 }],
    });
    await expect(recheckKnowledgeSources({ recheckUrlSources } as never)).resolves.toEqual({
      ok: true,
      checked: 2,
      changed: [{ sourceId: "source-1", url: "https://example.com", staleDocs: 3 }],
    });
    expect(KNOWLEDGE_SOURCE_RECHECK_LIMIT).toBe(10);
    expect(recheckUrlSources).toHaveBeenCalledWith(10);
  });
});
