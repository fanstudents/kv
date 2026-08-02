import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createLegacyVisitRespondSources, resolveVisitPublicInviteGet, fulfilVisitPublicInvite } = vi.hoisted(() => ({
  createLegacyVisitRespondSources: vi.fn(),
  resolveVisitPublicInviteGet: vi.fn(),
  fulfilVisitPublicInvite: vi.fn(),
}));

vi.mock("@/adapters/visit/legacy-respond-sources", () => ({ createLegacyVisitRespondSources }));
vi.mock("@/adapters/visit/visit-research-dependencies", () => ({
  createVisitResearchDependencies: vi.fn(() => ({})),
}));
vi.mock("@/modules/visit/respond", () => ({
  resolveVisitPublicInviteGet,
  fulfilVisitPublicInvite,
}));
vi.mock("@/modules/visit/research", () => ({ runVisitContactResearch: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  buildThankYouEmailHtml: vi.fn(),
  escapeHtml: (value: string) => value,
}));

import { GET, POST } from "@/app/api/agents/visit/respond/route";

const read = { kind: "read" };
const fulfilment = { kind: "fulfilment" };

beforeEach(() => {
  vi.clearAllMocks();
  createLegacyVisitRespondSources.mockReturnValue({ read, fulfilment });
});

describe("Visit public response route composition", () => {
  it("passes the shared read port to GET without changing the public message page", async () => {
    resolveVisitPublicInviteGet.mockResolvedValue({
      kind: "message",
      title: "時段已確認",
      message: "我們會再與您聯繫。",
    });

    const response = await GET(
      new NextRequest("http://localhost/api/agents/visit/respond?invite=invite-1&choice=1"),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("時段已確認");
    expect(resolveVisitPublicInviteGet).toHaveBeenCalledWith(expect.objectContaining({
      inviteId: "invite-1",
      choiceValue: "1",
      read,
      nowIso: expect.any(Function),
    }));
  });

  it("passes both ports from one composition to POST and preserves the public message page", async () => {
    fulfilVisitPublicInvite.mockResolvedValue({
      page: {
        kind: "message",
        title: "安排完成",
        message: "謝謝您的回覆。",
      },
    });
    const body = new FormData();
    body.set("location", "台北");

    const response = await POST(
      new NextRequest("http://localhost/api/agents/visit/respond?invite=invite-1", { method: "POST", body }),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("安排完成");
    expect(fulfilVisitPublicInvite).toHaveBeenCalledWith(expect.objectContaining({
      inviteId: "invite-1",
      locationValue: "台北",
      read,
      fulfilment,
      scheduleBackgroundResearch: expect.any(Function),
    }));
    expect(createLegacyVisitRespondSources).toHaveBeenCalledTimes(1);
  });
});
