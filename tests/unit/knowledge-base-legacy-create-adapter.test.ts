import { describe, expect, it, vi } from "vitest";

const { addKnowledgeDoc } = vi.hoisted(() => ({ addKnowledgeDoc: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/knowledge-base", () => ({ addKnowledgeDoc }));

import { createLegacyKnowledgeBaseCreateAdapter } from "@/adapters/knowledge-base/legacy-create-adapter";

describe("createLegacyKnowledgeBaseCreateAdapter", () => {
  it("keeps the existing add helper behind the create port", async () => {
    const input = { title: "Guide", category: "未分類", level: 1 as const, kind: "doc" as const, status: "published" as const };
    const doc = { id: "doc-1", title: input.title, category: input.category, level: input.level };
    addKnowledgeDoc.mockResolvedValue(doc);

    const adapter = createLegacyKnowledgeBaseCreateAdapter();
    await expect(adapter.add(input)).resolves.toBe(doc);
    expect(addKnowledgeDoc).toHaveBeenCalledWith(input);
  });
});
