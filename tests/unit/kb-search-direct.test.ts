import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  embedKnowledgeTexts: vi.fn(),
  getMainSupabase: vi.fn(),
}));

vi.mock("@/adapters/knowledge-base/openai-knowledge-provider", () => ({
  embedKnowledgeTexts: mocks.embedKnowledgeTexts,
}));
vi.mock("@/lib/supabase", () => ({ getMainSupabase: mocks.getMainSupabase }));

import { indexDocs, searchKnowledge } from "@/lib/kb-search";

beforeEach(() => {
  mocks.embedKnowledgeTexts.mockReset();
  mocks.getMainSupabase.mockReset();
});

describe("kb search direct fallback behavior", () => {
  it("does not create a database or embedding dependency when no document ids need indexing", async () => {
    await expect(indexDocs([])).resolves.toBe(0);

    expect(mocks.getMainSupabase).not.toHaveBeenCalled();
    expect(mocks.embedKnowledgeTexts).not.toHaveBeenCalled();
  });

  it("returns zero when embedding fails after prior chunks are cleared for a reindex", async () => {
    const readDocs = vi.fn().mockResolvedValue({
      data: [{ id: "doc-1", title: "Guide", content: "Published content", level: 1, status: "published", source_page: null }],
    });
    const clearChunks = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn((table: string) => {
      if (table === "knowledge_base") return { select: vi.fn(() => ({ in: readDocs })) };
      if (table === "kb_chunks") return { delete: vi.fn(() => ({ in: clearChunks })) };
      throw new Error(`unexpected table ${table}`);
    });
    mocks.getMainSupabase.mockReturnValue({ from });
    mocks.embedKnowledgeTexts.mockRejectedValue(new Error("embedding unavailable"));

    await expect(indexDocs(["doc-1"])).resolves.toBe(0);

    expect(clearChunks).toHaveBeenCalledWith("doc_id", ["doc-1"]);
    expect(mocks.embedKnowledgeTexts).toHaveBeenCalledWith(["Guide\nPublished content"]);
    expect(from).toHaveBeenCalledWith("kb_chunks");
  });

  it("fails closed without a database lookup when the embedding provider cannot return a query vector", async () => {
    const rpc = vi.fn();
    mocks.getMainSupabase.mockReturnValue({ rpc });
    mocks.embedKnowledgeTexts.mockRejectedValue(new Error("provider unavailable"));

    await expect(searchKnowledge({ question: "方案怎麼買？", maxLevel: 2 })).resolves.toEqual([]);

    expect(mocks.getMainSupabase).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns no hits when the database search RPC reports an error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "RPC unavailable" } });
    mocks.getMainSupabase.mockReturnValue({ rpc });
    mocks.embedKnowledgeTexts.mockResolvedValue([[0.1, 0.2, 0.3]]);

    await expect(searchKnowledge({ question: "方案怎麼買？", maxLevel: 2, limit: 4 })).resolves.toEqual([]);

    expect(rpc).toHaveBeenCalledWith("match_kb_chunks", {
      query_embedding: "[0.1,0.2,0.3]",
      max_level: 2,
      match_count: 4,
    });
  });
});
