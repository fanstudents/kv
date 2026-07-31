import { describe, expect, it, vi } from "vitest";

const { listAgentAccess, listKnowledgeDocs } = vi.hoisted(() => ({
  listAgentAccess: vi.fn(),
  listKnowledgeDocs: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/knowledge-base", () => ({ listAgentAccess, listKnowledgeDocs }));

import { createLegacyKnowledgeBaseReadAdapter } from "@/adapters/knowledge-base/legacy-read-adapter";

describe("createLegacyKnowledgeBaseReadAdapter", () => {
  it("keeps the existing knowledge helpers behind the read port", async () => {
    const docs = [{ id: "doc-1" }];
    const access = { support: 2 };
    listKnowledgeDocs.mockResolvedValue(docs);
    listAgentAccess.mockResolvedValue(access);

    const adapter = createLegacyKnowledgeBaseReadAdapter();
    await expect(adapter.listDocs({})).resolves.toBe(docs);
    await expect(adapter.listAccess()).resolves.toBe(access);
    expect(listKnowledgeDocs).toHaveBeenCalledWith({});
    expect(listAgentAccess).toHaveBeenCalledOnce();
  });
});
