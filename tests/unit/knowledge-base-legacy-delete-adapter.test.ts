import { describe, expect, it, vi } from "vitest";

const { removeKnowledgeDoc } = vi.hoisted(() => ({ removeKnowledgeDoc: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/knowledge-base", () => ({ removeKnowledgeDoc }));

import { createLegacyKnowledgeBaseDeleteAdapter } from "@/adapters/knowledge-base/legacy-delete-adapter";

describe("createLegacyKnowledgeBaseDeleteAdapter", () => {
  it("keeps the existing remove helper behind the delete port", async () => {
    removeKnowledgeDoc.mockResolvedValue("deleted");

    const adapter = createLegacyKnowledgeBaseDeleteAdapter();
    await expect(adapter.remove("doc-1")).resolves.toBe("deleted");
    expect(removeKnowledgeDoc).toHaveBeenCalledWith("doc-1");
  });
});
