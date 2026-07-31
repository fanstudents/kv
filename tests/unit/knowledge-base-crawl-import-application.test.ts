import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseCrawlImport } from "@/modules/knowledge-base/crawl-import-application";
import type { KnowledgeBaseCrawlImportPort } from "@/modules/knowledge-base/crawl-import-ports";

describe("knowledge base crawl import application", () => {
  it("imports first, then returns drafts and current credit usage", async () => {
    const port: KnowledgeBaseCrawlImportPort = {
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
      isQuotaError: vi.fn(),
    };

    await expect(
      runKnowledgeBaseCrawlImport(
        { url: "https://example.com", mode: "site", limit: 10 },
        port
      )
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

    expect(port.importUrl).toHaveBeenCalledWith({ url: "https://example.com", mode: "site", limit: 10 });
    expect(port.listDrafts).toHaveBeenCalledWith("source-1");
    expect(port.getCreditUsage).toHaveBeenCalledOnce();
  });

  it("preserves an unchanged import result", async () => {
    const port: KnowledgeBaseCrawlImportPort = {
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
      isQuotaError: vi.fn(),
    };

    await expect(
      runKnowledgeBaseCrawlImport(
        { url: "https://example.com/page", mode: "single", limit: 25 },
        port
      )
    ).resolves.toMatchObject({ unchanged: true, docs: [], credit: null });
  });
});
