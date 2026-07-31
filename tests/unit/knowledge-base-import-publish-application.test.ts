import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseImportPublish } from "@/modules/knowledge-base/import-publish-application";

describe("runKnowledgeBaseImportPublish", () => {
  it("delegates selected ids and preserves the published count", async () => {
    const publish = vi.fn(async () => 2);

    await expect(runKnowledgeBaseImportPublish(["doc-1", "doc-2"], { publish })).resolves.toEqual({ published: 2 });
    expect(publish).toHaveBeenCalledWith(["doc-1", "doc-2"]);
  });
});
