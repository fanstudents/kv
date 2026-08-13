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

  it("preserves the prior index when embedding fails before the atomic replacement", async () => {
    const readDocs = vi.fn().mockResolvedValue({
      data: [{ id: "doc-1", title: "Guide", content: "Published content", level: 1, status: "published", source_page: null }],
      error: null,
    });
    const from = vi.fn((table: string) => {
      if (table === "knowledge_base") return { select: vi.fn(() => ({ in: readDocs })) };
      throw new Error(`unexpected table ${table}`);
    });
    const rpc = vi.fn();
    mocks.getMainSupabase.mockReturnValue({ from, rpc });
    mocks.embedKnowledgeTexts.mockRejectedValue(new Error("embedding unavailable"));

    await expect(indexDocs(["doc-1"])).resolves.toBe(0);

    expect(mocks.embedKnowledgeTexts).toHaveBeenCalledWith(["Guide\nPublished content"]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("replaces all chunks through one database RPC after embeddings are complete", async () => {
    const readDocs = vi.fn().mockResolvedValue({
      data: [{ id: "doc-1", title: "Guide", content: "Published content", level: 1, status: "published", source_page: 3 }],
      error: null,
    });
    const from = vi.fn(() => ({ select: vi.fn(() => ({ in: readDocs })) }));
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    mocks.getMainSupabase.mockReturnValue({ from, rpc });
    mocks.embedKnowledgeTexts.mockResolvedValue([Array.from({ length: 1536 }, () => 0.25)]);

    await expect(indexDocs(["doc-1"])).resolves.toBe(1);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("replace_kb_chunks", {
      p_doc_ids: ["doc-1"],
      p_chunks: [
        expect.objectContaining({
          doc_id: "doc-1",
          chunk_index: 0,
          content: "Guide\nPublished content",
          level: 1,
          source_page: 3,
          embedding: expect.stringMatching(/^\[0\.25,/),
        }),
      ],
    });
  });

  it("atomically clears chunks for documents that are no longer published", async () => {
    const readDocs = vi.fn().mockResolvedValue({
      data: [{ id: "doc-1", title: "Draft", content: "Not searchable", level: 1, status: "draft", source_page: null }],
      error: null,
    });
    const from = vi.fn(() => ({ select: vi.fn(() => ({ in: readDocs })) }));
    const rpc = vi.fn().mockResolvedValue({ data: 0, error: null });
    mocks.getMainSupabase.mockReturnValue({ from, rpc });

    await expect(indexDocs(["doc-1"])).resolves.toBe(0);

    expect(mocks.embedKnowledgeTexts).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("replace_kb_chunks", {
      p_doc_ids: ["doc-1"],
      p_chunks: [],
    });
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
