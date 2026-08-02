import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addKnowledgeDocs: vi.fn(),
  getMainSupabase: vi.fn(),
  requestKnowledgeJson: vi.fn(),
}));

vi.mock("@/adapters/knowledge-base/openai-knowledge-provider", () => ({
  requestKnowledgeJson: mocks.requestKnowledgeJson,
}));
vi.mock("@/lib/knowledge-base", () => ({ addKnowledgeDocs: mocks.addKnowledgeDocs }));
vi.mock("@/lib/supabase", () => ({ getMainSupabase: mocks.getMainSupabase }));

import { ingestPages } from "@/lib/kb-import";

beforeEach(() => {
  mocks.addKnowledgeDocs.mockReset();
  mocks.getMainSupabase.mockReset();
  mocks.requestKnowledgeJson.mockReset();
});

describe("kb import direct pipeline", () => {
  it("keeps later chunks, applies sensitivity safeguards, and reaches reviewing when one conversion fails", async () => {
    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn(() => ({ eq: updateEq }));
    mocks.getMainSupabase.mockReturnValue({ from: vi.fn(() => ({ update })) });
    mocks.addKnowledgeDocs.mockResolvedValue(undefined);
    mocks.requestKnowledgeJson
      .mockRejectedValueOnce(new Error("first chunk unavailable"))
      .mockResolvedValueOnce({
        items: [
          {
            question: "如何取得報價？",
            answer: "請寄信到 demo@example.com 索取 NT$ 1,000 的方案報價。",
            kind: "not-a-supported-kind",
            level: 1,
            category: "客服",
            confidence: 1.4,
          },
        ],
      });
    const firstPage = "第一段可匯入的流程文字。".repeat(12);
    const secondPage = "第二段完整內容，會形成另一個 chunk 並交給模型整理。".repeat(120);

    await expect(
      ingestPages({ sourceId: "source-1", pages: [firstPage, secondPage], label: "https://example.com/guide" }),
    ).resolves.toEqual({ chunkCount: 2, processedChunks: 2, candidateCount: 1, truncated: false });

    expect(mocks.requestKnowledgeJson).toHaveBeenCalledTimes(2);
    expect(mocks.addKnowledgeDocs).toHaveBeenCalledWith([
      {
        title: "如何取得報價？",
        content: "請寄信到 demo@example.com 索取 NT$ 1,000 的方案報價。",
        category: "客服",
        level: 3,
        kind: "faq",
        status: "draft",
        sourceDocId: "source-1",
        sourcePage: 2,
        meta: {
          confidence: 1,
          flags: ["電子郵件", "金額／報價"],
          source: "https://example.com/guide",
        },
      },
    ]);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "reviewing" }));
    expect(updateEq).toHaveBeenCalledWith("id", "source-1");
  });
});
