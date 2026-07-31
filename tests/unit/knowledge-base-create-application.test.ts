import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseCreate } from "@/modules/knowledge-base/create-application";

describe("runKnowledgeBaseCreate", () => {
  it("delegates the normalized input and returns the created document", async () => {
    const input = { title: "Guide", category: "未分類", level: 1 as const, kind: "doc" as const, status: "published" as const };
    const doc = { id: "doc-1", title: input.title, category: input.category, level: input.level };
    const add = vi.fn(async () => doc);

    await expect(runKnowledgeBaseCreate(input, { add })).resolves.toBe(doc);
    expect(add).toHaveBeenCalledWith(input);
  });
});
