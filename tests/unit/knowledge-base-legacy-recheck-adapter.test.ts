import { describe, expect, it, vi } from "vitest";

const { recheckUrlSources } = vi.hoisted(() => ({ recheckUrlSources: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/kb-crawl", () => ({ recheckUrlSources }));

import { createLegacyKnowledgeBaseRecheckAdapter } from "@/adapters/knowledge-base/legacy-recheck-adapter";

describe("legacy knowledge base recheck adapter", () => {
  it("delegates scheduled source rechecks to the existing helper", async () => {
    const result = { checked: 1, changed: [] };
    recheckUrlSources.mockResolvedValue(result);
    const adapter = createLegacyKnowledgeBaseRecheckAdapter();

    await expect(adapter.recheckUrlSources(10)).resolves.toBe(result);
    expect(recheckUrlSources).toHaveBeenCalledWith(10);
  });
});
