import { beforeEach, describe, expect, it, vi } from "vitest";

const { indexDocs, indexStats, listKnowledgeDocs } = vi.hoisted(() => ({
  indexDocs: vi.fn(),
  indexStats: vi.fn(),
  listKnowledgeDocs: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-search", () => ({ indexDocs, indexStats }));
vi.mock("@/lib/knowledge-base", () => ({ listKnowledgeDocs }));

import { createLegacyKnowledgeBaseReindexAdapter } from "@/adapters/knowledge-base/legacy-reindex-adapter";

describe("createLegacyKnowledgeBaseReindexAdapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps published-doc selection and search helpers behind the port", async () => {
    const docs = [{ id: "doc-1", content: "Guide" }];
    listKnowledgeDocs.mockResolvedValue(docs);
    indexDocs.mockResolvedValue(1);
    indexStats.mockResolvedValue({ chunks: 1, docs: 1 });

    const adapter = createLegacyKnowledgeBaseReindexAdapter();

    await expect(adapter.listPublishedDocs()).resolves.toEqual(docs);
    await expect(adapter.indexDocs(["doc-1"])).resolves.toBe(1);
    await expect(adapter.indexStats()).resolves.toEqual({ chunks: 1, docs: 1 });
    expect(listKnowledgeDocs).toHaveBeenCalledWith({ status: "published" });
    expect(indexDocs).toHaveBeenCalledWith(["doc-1"]);
    expect(indexStats).toHaveBeenCalledOnce();
  });
});
