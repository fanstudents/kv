import { describe, expect, it, vi } from "vitest";
import { runKnowledgeAccessUpdate } from "@/modules/knowledge-base/access-application";

describe("runKnowledgeAccessUpdate", () => {
  it("writes a valid access update", async () => {
    const setAccess = vi.fn(async () => undefined);
    await expect(
      runKnowledgeAccessUpdate(
        { kind: "ok", input: { agentSlug: "support", level: 3 } },
        { setAccess },
      ),
    ).resolves.toEqual({ kind: "ok" });
    expect(setAccess).toHaveBeenCalledWith("support", 3);
  });

  it("does not call the provider for invalid input", async () => {
    const setAccess = vi.fn(async () => undefined);
    await expect(
      runKnowledgeAccessUpdate({ kind: "invalid", message: "agentSlug 或 level 不合法" }, { setAccess }),
    ).resolves.toEqual({ kind: "invalid", message: "agentSlug 或 level 不合法" });
    expect(setAccess).not.toHaveBeenCalled();
  });
});
