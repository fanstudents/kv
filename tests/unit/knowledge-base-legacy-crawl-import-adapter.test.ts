import { describe, expect, it, vi } from "vitest";

const { FakeQuotaError, getCreditUsage, importUrl, listKnowledgeDocs } = vi.hoisted(() => {
  class FakeQuotaError extends Error {}
  return {
    FakeQuotaError,
    getCreditUsage: vi.fn(),
    importUrl: vi.fn(),
    listKnowledgeDocs: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-crawl", () => ({ FirecrawlQuotaError: FakeQuotaError, getCreditUsage, importUrl }));
vi.mock("@/lib/knowledge-base", () => ({ listKnowledgeDocs }));

import { createLegacyKnowledgeBaseCrawlImportAdapter } from "@/adapters/knowledge-base/legacy-crawl-import-adapter";

describe("legacy knowledge base crawl import adapter", () => {
  it("keeps import, draft listing, credit usage, and quota classification delegated", async () => {
    const docs = [{ id: "doc-1" }];
    importUrl.mockResolvedValue({ sourceId: "source-1" });
    listKnowledgeDocs.mockResolvedValue(docs);
    getCreditUsage.mockResolvedValue(null);
    const adapter = createLegacyKnowledgeBaseCrawlImportAdapter();

    await expect(adapter.importUrl({ url: "https://example.com", mode: "single", limit: 25 })).resolves.toEqual({ sourceId: "source-1" });
    await expect(adapter.listDrafts("source-1")).resolves.toBe(docs);
    await expect(adapter.getCreditUsage()).resolves.toBeNull();
    expect(listKnowledgeDocs).toHaveBeenCalledWith({ status: "draft", sourceDocId: "source-1" });
    expect(adapter.isQuotaError(new FakeQuotaError())).toBe(true);
    expect(adapter.isQuotaError(new Error("other"))).toBe(false);
  });
});
