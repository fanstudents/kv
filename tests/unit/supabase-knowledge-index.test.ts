import { describe, expect, it, vi } from "vitest";

const helpers = vi.hoisted(() => ({
  indexDocs: vi.fn(),
  indexStats: vi.fn(),
  listKnowledgeDocs: vi.fn(),
}));

vi.mock("@/lib/kb-search", () => ({ indexDocs: helpers.indexDocs, indexStats: helpers.indexStats }));
vi.mock("@/lib/knowledge-base", () => ({ listKnowledgeDocs: helpers.listKnowledgeDocs }));

import { createSupabaseKnowledgeIndex } from "@/adapters/knowledge-base/supabase-knowledge-index";

describe("createSupabaseKnowledgeIndex", () => {
  it("keeps published-doc selection and search helpers behind the index boundary", async () => {
    const docs = [{ id: "doc-1", content: "Guide" }];
    helpers.listKnowledgeDocs.mockResolvedValue(docs);
    helpers.indexDocs.mockResolvedValue(1);
    helpers.indexStats.mockResolvedValue({ chunks: 1, docs: 1 });
    const repository = createSupabaseKnowledgeIndex();

    await expect(repository.listPublishedDocs()).resolves.toEqual(docs);
    await expect(repository.indexDocs(["doc-1"])).resolves.toBe(1);
    await expect(repository.indexStats()).resolves.toEqual({ chunks: 1, docs: 1 });
    expect(helpers.listKnowledgeDocs).toHaveBeenCalledWith({ status: "published" });
    expect(helpers.indexDocs).toHaveBeenCalledWith(["doc-1"]);
    expect(helpers.indexStats).toHaveBeenCalledOnce();
  });
});
