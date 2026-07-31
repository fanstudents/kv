import { describe, expect, it, vi } from "vitest";

const { getLineMessageContentAsDataUrl, parseBusinessCard } = vi.hoisted(() => ({
  getLineMessageContentAsDataUrl: vi.fn(),
  parseBusinessCard: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/line", () => ({ getLineMessageContentAsDataUrl }));
vi.mock("@/adapters/visit/legacy-provider-adapter", () => ({ legacyVisitProviders: { parseBusinessCard } }));

import { createLegacyVisitLineImageAdapter } from "@/adapters/visit/legacy-line-adapters";

describe("legacy Visit LINE image adapter", () => {
  it("keeps LINE content retrieval and card parsing provider bindings", async () => {
    getLineMessageContentAsDataUrl.mockResolvedValue("data:image/png;base64,abc");
    parseBusinessCard.mockResolvedValue({ name: "Dennis", company: "TBR", title: "", email: "", phone: "" });
    const adapter = createLegacyVisitLineImageAdapter();

    await expect(adapter.getImageDataUrl("message-1")).resolves.toBe("data:image/png;base64,abc");
    await expect(adapter.parseBusinessCard("data:image/png;base64,abc")).resolves.toMatchObject({ name: "Dennis" });
    expect(getLineMessageContentAsDataUrl).toHaveBeenCalledWith("message-1");
    expect(parseBusinessCard).toHaveBeenCalledWith("data:image/png;base64,abc");
  });
});
