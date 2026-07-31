import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseUpdate } from "@/modules/knowledge-base/update-application";

const input = { id: "doc-1", patch: { title: "Guide" } };
const doc = { id: "doc-1", title: "Guide", category: "ops", level: 1 as const };

describe("runKnowledgeBaseUpdate", () => {
  it("maps success and not-found provider results", async () => {
    await expect(runKnowledgeBaseUpdate(input, { update: vi.fn(async () => doc) })).resolves.toEqual({
      kind: "ok",
      data: doc,
    });
    await expect(runKnowledgeBaseUpdate(input, { update: vi.fn(async () => null) })).resolves.toEqual({
      kind: "not-found",
    });
  });

  it("maps provider exceptions to the existing error message contract", async () => {
    await expect(
      runKnowledgeBaseUpdate(input, { update: vi.fn(async () => { throw new Error("provider failed"); }) }),
    ).resolves.toEqual({ kind: "error", message: "provider failed" });
    await expect(
      runKnowledgeBaseUpdate(input, { update: vi.fn(async () => { throw "unknown"; }) }),
    ).resolves.toEqual({ kind: "error", message: "更新失敗" });
  });
});
