import { describe, expect, it, vi } from "vitest";

const { setAgentAccess } = vi.hoisted(() => ({ setAgentAccess: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/knowledge-base", () => ({ setAgentAccess }));

import { createLegacyKnowledgeAccessUpdateAdapter } from "@/adapters/knowledge-base/legacy-access-update-adapter";

describe("createLegacyKnowledgeAccessUpdateAdapter", () => {
  it("keeps the existing setAgentAccess helper behind the port", async () => {
    setAgentAccess.mockResolvedValue(undefined);
    await createLegacyKnowledgeAccessUpdateAdapter().setAccess("support", 2);
    expect(setAgentAccess).toHaveBeenCalledWith("support", 2);
  });
});
