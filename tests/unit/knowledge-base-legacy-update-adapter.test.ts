import { describe, expect, it, vi } from "vitest";

const { updateKnowledgeDoc } = vi.hoisted(() => ({ updateKnowledgeDoc: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/knowledge-base", () => ({ updateKnowledgeDoc }));

import { createLegacyKnowledgeBaseUpdateAdapter } from "@/adapters/knowledge-base/legacy-update-adapter";

describe("createLegacyKnowledgeBaseUpdateAdapter", () => {
  it("keeps the existing update helper behind the update port", async () => {
    const input = { id: "doc-1", patch: { title: "Guide" } };
    const doc = { id: "doc-1", title: "Guide", category: "ops", level: 1 as const };
    updateKnowledgeDoc.mockResolvedValue(doc);

    const adapter = createLegacyKnowledgeBaseUpdateAdapter();
    await expect(adapter.update(input)).resolves.toBe(doc);
    expect(updateKnowledgeDoc).toHaveBeenCalledWith(input.id, input.patch);
  });
});
