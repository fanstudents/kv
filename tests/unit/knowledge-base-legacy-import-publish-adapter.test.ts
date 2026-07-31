import { describe, expect, it, vi } from "vitest";

const { publishKnowledgeDocs } = vi.hoisted(() => ({ publishKnowledgeDocs: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/knowledge-base", () => ({ publishKnowledgeDocs }));

import { createLegacyKnowledgeBaseImportPublishAdapter } from "@/adapters/knowledge-base/legacy-import-publish-adapter";

describe("createLegacyKnowledgeBaseImportPublishAdapter", () => {
  it("keeps the existing publish helper behind the publish port", async () => {
    publishKnowledgeDocs.mockResolvedValue(1);
    const adapter = createLegacyKnowledgeBaseImportPublishAdapter();

    await expect(adapter.publish(["doc-1"])).resolves.toBe(1);
    expect(publishKnowledgeDocs).toHaveBeenCalledWith(["doc-1"]);
  });
});
