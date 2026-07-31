import { describe, expect, it, vi } from "vitest";

const { removeKnowledgeDoc } = vi.hoisted(() => ({ removeKnowledgeDoc: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/knowledge-base", () => ({ removeKnowledgeDoc }));

import { createLegacyKnowledgeBaseImportDiscardAdapter } from "@/adapters/knowledge-base/legacy-import-discard-adapter";

describe("createLegacyKnowledgeBaseImportDiscardAdapter", () => {
  it("keeps the existing delete helper behind the discard port", async () => {
    removeKnowledgeDoc.mockResolvedValue("deleted");
    const adapter = createLegacyKnowledgeBaseImportDiscardAdapter();

    await expect(adapter.remove("doc-1")).resolves.toBe("deleted");
    expect(removeKnowledgeDoc).toHaveBeenCalledWith("doc-1");
  });
});
