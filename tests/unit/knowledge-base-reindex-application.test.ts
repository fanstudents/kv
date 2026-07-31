import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseIndexStats, runKnowledgeBaseReindex } from "@/modules/knowledge-base/reindex-application";

describe("runKnowledgeBaseIndexStats", () => {
  it("delegates stats reads without changing the result", async () => {
    const stats = { chunks: 4, docs: 2 };
    const indexStats = vi.fn(async () => stats);

    await expect(runKnowledgeBaseIndexStats({ indexStats } as never)).resolves.toEqual(stats);
    expect(indexStats).toHaveBeenCalledOnce();
  });
});

describe("runKnowledgeBaseReindex", () => {
  it("indexes only non-empty published docs and returns the legacy envelope", async () => {
    const listPublishedDocs = vi.fn(async () => [
      { id: "doc-1", content: "Guide" },
      { id: "doc-2", content: "  " },
      { id: "doc-3", content: "FAQ" },
    ]);
    const indexDocs = vi.fn(async () => 3);
    const indexStats = vi.fn(async () => ({ chunks: 3, docs: 2 }));

    await expect(runKnowledgeBaseReindex({ listPublishedDocs, indexDocs, indexStats })).resolves.toEqual({
      published: 3,
      indexable: 2,
      chunks: 3,
      stats: { chunks: 3, docs: 2 },
    });
    expect(indexDocs).toHaveBeenCalledWith(["doc-1", "doc-3"]);
    expect(indexStats).toHaveBeenCalledOnce();
  });
});
