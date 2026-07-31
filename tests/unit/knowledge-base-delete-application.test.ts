import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseDelete } from "@/modules/knowledge-base/delete-application";

describe("runKnowledgeBaseDelete", () => {
  it("preserves deleted, not-found, and builtin-protected outcomes", async () => {
    for (const outcome of ["deleted", "not-found", "builtin-protected"] as const) {
      await expect(runKnowledgeBaseDelete("doc-1", { remove: vi.fn(async () => outcome) })).resolves.toEqual({
        kind: outcome,
      });
    }
  });
});
