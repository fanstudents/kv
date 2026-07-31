import { describe, expect, it, vi } from "vitest";
import { runKnowledgeBaseRecheck, KNOWLEDGE_BASE_RECHECK_LIMIT } from "@/modules/knowledge-base/recheck-application";
import type { KnowledgeBaseRecheckPort } from "@/modules/knowledge-base/recheck-ports";

describe("knowledge base recheck application", () => {
  it("keeps the fixed ten-source schedule limit and response envelope", async () => {
    const port: KnowledgeBaseRecheckPort = {
      recheckUrlSources: vi.fn().mockResolvedValue({
        checked: 2,
        changed: [{ sourceId: "source-1", url: "https://example.com", staleDocs: 3 }],
      }),
    };

    await expect(runKnowledgeBaseRecheck(port)).resolves.toEqual({
      ok: true,
      checked: 2,
      changed: [{ sourceId: "source-1", url: "https://example.com", staleDocs: 3 }],
    });
    expect(KNOWLEDGE_BASE_RECHECK_LIMIT).toBe(10);
    expect(port.recheckUrlSources).toHaveBeenCalledWith(10);
  });
});
