import { describe, expect, it } from "vitest";
import { parseKnowledgeAccessUpdateRequest } from "@/modules/knowledge-base/access-rules";

const catalog = [{ slug: "support" }, { slug: "teamlead" }];

describe("parseKnowledgeAccessUpdateRequest", () => {
  it("accepts a catalog slug and numeric level", () => {
    expect(parseKnowledgeAccessUpdateRequest({ agentSlug: "support", level: "3" }, catalog)).toEqual({
      kind: "ok",
      input: { agentSlug: "support", level: 3 },
    });
  });

  it("rejects unknown slugs and out-of-range levels", () => {
    expect(parseKnowledgeAccessUpdateRequest({ agentSlug: "unknown", level: 2 }, catalog)).toEqual({
      kind: "invalid",
      message: "agentSlug 或 level 不合法",
    });
    expect(parseKnowledgeAccessUpdateRequest({ agentSlug: "support", level: 5 }, catalog)).toEqual({
      kind: "invalid",
      message: "agentSlug 或 level 不合法",
    });
  });
});
