import { beforeEach, describe, expect, it, vi } from "vitest";

const { listKbSources, listKnowledgeDocs } = vi.hoisted(() => ({
  listKbSources: vi.fn(),
  listKnowledgeDocs: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-import", () => ({ listKbSources }));
vi.mock("@/lib/knowledge-base", () => ({ listKnowledgeDocs }));

import { createLegacyKnowledgeBaseImportReadAdapter } from "@/adapters/knowledge-base/legacy-import-read-adapter";

describe("createLegacyKnowledgeBaseImportReadAdapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps source and draft reads behind the import read port", async () => {
    const sources = [{ id: "source-1", filename: "guide.pdf", page_count: 2, status: "reviewing", created_at: "now" }];
    const docs = [{ id: "doc-1", title: "Guide", category: "ops", level: 1 as const }];
    listKbSources.mockResolvedValue(sources);
    listKnowledgeDocs.mockResolvedValue(docs);

    const adapter = createLegacyKnowledgeBaseImportReadAdapter();

    await expect(adapter.listSources()).resolves.toBe(sources);
    await expect(adapter.listDraftDocs("source-1")).resolves.toBe(docs);
    expect(listKbSources).toHaveBeenCalledOnce();
    expect(listKnowledgeDocs).toHaveBeenCalledWith({ status: "draft", sourceDocId: "source-1" });
  });
});
