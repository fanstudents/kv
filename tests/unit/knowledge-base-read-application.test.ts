import { describe, expect, it, vi } from "vitest";
import type { AgentSlug } from "@/lib/types";
import type { KnowledgeLevel } from "@/lib/knowledge-base-data";
import { runKnowledgeBaseRead } from "@/modules/knowledge-base/read-application";

describe("runKnowledgeBaseRead", () => {
  it("loads docs and access in parallel and preserves both result shapes", async () => {
    const docs = [{ id: "doc-1", title: "Guide", category: "ops", level: 1 as const }];
    const access = {} as Record<AgentSlug, KnowledgeLevel>;
    access.support = 2;
    const listDocs = vi.fn(async () => docs);
    const listAccess = vi.fn(async () => access);

    await expect(runKnowledgeBaseRead({ status: "published" }, { listDocs, listAccess })).resolves.toEqual({
      docs,
      access,
    });
    expect(listDocs).toHaveBeenCalledWith({ status: "published" });
    expect(listAccess).toHaveBeenCalledOnce();
  });
});
