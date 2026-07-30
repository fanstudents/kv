import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyLiveTaskHistoryAdapter } from "@/adapters/live-task/legacy-history-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Live Task history adapter", () => {
  it("keeps the existing contacts, offers, and invites queries", async () => {
    const contactLimit = vi.fn().mockResolvedValue({
      data: [{ id: "c1", name: "A", company: null, created_at: "2026-07-31T01:00:00Z" }],
    });
    const contactOrder = vi.fn(() => ({ limit: contactLimit }));
    const contactEq = vi.fn(() => ({ order: contactOrder }));
    const offerOrder = vi.fn().mockResolvedValue({
      data: [{ contact_id: "c1", status: "accepted", created_at: "2026-07-31T02:00:00Z" }],
    });
    const offerIn = vi.fn(() => ({ order: offerOrder }));
    const inviteOrder = vi.fn().mockResolvedValue({
      data: [{ contact_id: "c1", status: "pending", created_at: "2026-07-31T03:00:00Z" }],
    });
    const inviteIn = vi.fn(() => ({ order: inviteOrder }));
    const from = vi.fn((table: string) => {
      if (table === "contacts") return { select: vi.fn(() => ({ eq: contactEq })) };
      if (table === "visit_offers") return { select: vi.fn(() => ({ in: offerIn })) };
      return { select: vi.fn(() => ({ in: inviteIn })) };
    });
    getSupabase.mockReturnValue({ from });
    const adapter = createLegacyLiveTaskHistoryAdapter();

    await expect(adapter.listContacts(8)).resolves.toEqual([
      { id: "c1", name: "A", company: null, createdAt: "2026-07-31T01:00:00Z" },
    ]);
    expect(from).toHaveBeenCalledWith("contacts");
    expect(contactEq).toHaveBeenCalledWith("source", "line_card");
    expect(contactOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(contactLimit).toHaveBeenCalledWith(8);

    await expect(adapter.listOffers(["c1"])).resolves.toEqual([
      { contactId: "c1", status: "accepted", createdAt: "2026-07-31T02:00:00Z" },
    ]);
    expect(from).toHaveBeenCalledWith("visit_offers");
    expect(offerIn).toHaveBeenCalledWith("contact_id", ["c1"]);

    await expect(adapter.listInvites(["c1"])).resolves.toEqual([
      { contactId: "c1", status: "pending", createdAt: "2026-07-31T03:00:00Z" },
    ]);
    expect(from).toHaveBeenCalledWith("pending_invites");
    expect(inviteIn).toHaveBeenCalledWith("contact_id", ["c1"]);
    expect(getSupabase).toHaveBeenCalledTimes(3);
  });
});
