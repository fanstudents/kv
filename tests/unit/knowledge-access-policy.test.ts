import { describe, expect, it, vi } from "vitest";
import { parseKnowledgeAccessUpdate, updateKnowledgeAccess } from "@/modules/knowledge-base/access-policy";

const catalog = [{ slug: "support" }, { slug: "teamlead" }];

describe("knowledge access policy", () => {
  it("accepts a catalog slug and numeric level", () => {
    expect(parseKnowledgeAccessUpdate({ agentSlug: "support", level: "3" }, catalog)).toEqual({
      kind: "ok",
      input: { agentSlug: "support", level: 3 },
    });
  });

  it("rejects unknown slugs and out-of-range levels", () => {
    expect(parseKnowledgeAccessUpdate({ agentSlug: "unknown", level: 2 }, catalog)).toEqual({
      kind: "invalid",
      message: "agentSlug 或 level 不合法",
    });
    expect(parseKnowledgeAccessUpdate({ agentSlug: "support", level: 5 }, catalog)).toEqual({
      kind: "invalid",
      message: "agentSlug 或 level 不合法",
    });
  });

  it("writes valid access", async () => {
    const setAccess = vi.fn(async () => undefined);
    await expect(
      updateKnowledgeAccess({ kind: "ok", input: { agentSlug: "support", level: 3 } }, { setAccess }),
    ).resolves.toEqual({ kind: "ok" });
    expect(setAccess).toHaveBeenCalledWith("support", 3);
  });

  it("does not call the repository for invalid input", async () => {
    const setAccess = vi.fn(async () => undefined);
    await expect(
      updateKnowledgeAccess({ kind: "invalid", message: "agentSlug 或 level 不合法" }, { setAccess }),
    ).resolves.toEqual({ kind: "invalid", message: "agentSlug 或 level 不合法" });
    expect(setAccess).not.toHaveBeenCalled();
  });
});
