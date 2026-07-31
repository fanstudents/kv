import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseImportDiscard } from "@/modules/knowledge-base/import-discard-application";

describe("runKnowledgeBaseImportDiscard", () => {
  it("removes ids sequentially and counts only deleted outcomes", async () => {
    const calls: string[] = [];
    const remove = vi.fn(async (id: string) => {
      calls.push(id);
      if (id === "doc-1") return "deleted" as const;
      if (id === "doc-2") return "not-found" as const;
      return "builtin-protected" as const;
    });

    await expect(runKnowledgeBaseImportDiscard({ ids: ["doc-1", "doc-2", "doc-3"] }, { remove })).resolves.toEqual({
      removed: 1,
    });
    expect(calls).toEqual(["doc-1", "doc-2", "doc-3"]);
  });
});
