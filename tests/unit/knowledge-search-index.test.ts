import { describe, expect, it, vi } from "vitest";
import {
  readKnowledgeIndexStats,
  rebuildKnowledgeIndex,
  selectIndexableKnowledgeDocuments,
} from "@/modules/knowledge-base/search-index";

describe("knowledge search index", () => {
  it("keeps only non-empty documents without changing order", () => {
    const docs = [
      { id: "doc-1", content: "Guide" },
      { id: "doc-2", content: "   " },
      { id: "doc-3", content: null },
      { id: "doc-4" },
      { id: "doc-5", content: "FAQ" },
    ];

    expect(selectIndexableKnowledgeDocuments(docs)).toEqual([
      { id: "doc-1", content: "Guide" },
      { id: "doc-5", content: "FAQ" },
    ]);
  });

  it("delegates stats reads without changing the result", async () => {
    const stats = { chunks: 4, docs: 2 };
    const indexStats = vi.fn(async () => stats);

    await expect(readKnowledgeIndexStats({ indexStats } as never)).resolves.toEqual(stats);
    expect(indexStats).toHaveBeenCalledOnce();
  });

  it("indexes only non-empty published docs and returns the existing envelope", async () => {
    const listPublishedDocs = vi.fn(async () => [
      { id: "doc-1", content: "Guide" },
      { id: "doc-2", content: "  " },
      { id: "doc-3", content: "FAQ" },
    ]);
    const indexDocs = vi.fn(async () => 3);
    const indexStats = vi.fn(async () => ({ chunks: 3, docs: 2 }));

    await expect(rebuildKnowledgeIndex({ listPublishedDocs, indexDocs, indexStats })).resolves.toEqual({
      published: 3,
      indexable: 2,
      chunks: 3,
      stats: { chunks: 3, docs: 2 },
    });
    expect(indexDocs).toHaveBeenCalledWith(["doc-1", "doc-3"]);
    expect(indexStats).toHaveBeenCalledOnce();
  });
});
