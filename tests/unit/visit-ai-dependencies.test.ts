import { describe, expect, it, vi } from "vitest";

const { draftInviteEmail, parseBusinessCard, getSupabase } = vi.hoisted(() => ({
  draftInviteEmail: vi.fn(),
  parseBusinessCard: vi.fn(),
  getSupabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/adapters/visit/legacy-provider-adapter", () => ({ legacyVisitProviders: { draftInviteEmail, parseBusinessCard } }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyVisitAiDependencies } from "@/adapters/visit/legacy-ai-dependencies";

describe("legacy Visit AI dependencies", () => {
  it("keeps provider bindings and visit activity rows", async () => {
    draftInviteEmail.mockResolvedValue({ subject: "邀約", body: "內容" });
    parseBusinessCard.mockResolvedValue({ name: "Dennis", company: "TBR", title: "", email: "", phone: "" });
    const activityQuery = { insert: vi.fn().mockResolvedValue({ error: null }) };
    getSupabase.mockReturnValue({ from: vi.fn(() => activityQuery) });
    const adapter = createLegacyVisitAiDependencies();

    await expect(adapter.draftInviteEmail({ contactName: "Dennis", contactTitle: "", company: "", meetingType: "喝咖啡", slot1: "A", slot2: "B", senderName: "" })).resolves.toEqual({ subject: "邀約", body: "內容" });
    await expect(adapter.parseBusinessCard("data:image/png;base64,abc")).resolves.toMatchObject({ name: "Dennis" });
    await adapter.recordActivity({ summary: "done", status: "success" });

    expect(draftInviteEmail).toHaveBeenCalledOnce();
    expect(parseBusinessCard).toHaveBeenCalledWith("data:image/png;base64,abc");
    expect(activityQuery.insert).toHaveBeenCalledWith({ agent_slug: "visit", summary: "done", status: "success" });
  });
});
