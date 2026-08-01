import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createSupabaseVisitLiveTaskHistoryRepository } from "@/adapters/live-task/supabase-visit-history-repository";

beforeEach(() => vi.clearAllMocks());

describe("Supabase Visit live task history repository", () => {
  it("keeps the contacts, offers, and invites queries", async () => {
    const contactLimit = vi.fn(async () => ({ data: [{ id: "c1", name: "A", company: null, created_at: "2026-07-31T01:00:00Z" }] }));
    const contactOrder = vi.fn(() => ({ limit: contactLimit }));
    const contactEq = vi.fn(() => ({ order: contactOrder }));
    const offerOrder = vi.fn(async () => ({ data: [
      { contact_id: "c1", status: "accepted", created_at: "2026-07-31T02:00:00Z" },
      { contact_id: null, status: "pending", created_at: "2026-07-31T02:30:00Z" },
    ] }));
    const offerIn = vi.fn(() => ({ order: offerOrder }));
    const inviteOrder = vi.fn(async () => ({ data: [
      { contact_id: "c1", status: "pending", created_at: "2026-07-31T03:00:00Z" },
      { contact_id: null, status: "cancelled", created_at: "2026-07-31T03:30:00Z" },
    ] }));
    const inviteIn = vi.fn(() => ({ order: inviteOrder }));
    const from = vi.fn((table: string) => {
      if (table === "contacts") return { select: vi.fn(() => ({ eq: contactEq })) };
      if (table === "visit_offers") return { select: vi.fn(() => ({ in: offerIn })) };
      return { select: vi.fn(() => ({ in: inviteIn })) };
    });
    getMainSupabase.mockReturnValue({ from });
    const repository = createSupabaseVisitLiveTaskHistoryRepository();

    await expect(repository.listContacts(8)).resolves.toEqual([{ id: "c1", name: "A", company: null, createdAt: "2026-07-31T01:00:00Z" }]);
    expect(contactEq).toHaveBeenCalledWith("source", "line_card");
    expect(contactOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(contactLimit).toHaveBeenCalledWith(8);

    await expect(repository.listOffers(["c1"])).resolves.toEqual([{ contactId: "c1", status: "accepted", createdAt: "2026-07-31T02:00:00Z" }]);
    expect(offerIn).toHaveBeenCalledWith("contact_id", ["c1"]);

    await expect(repository.listInvites(["c1"])).resolves.toEqual([{ contactId: "c1", status: "pending", createdAt: "2026-07-31T03:00:00Z" }]);
    expect(inviteIn).toHaveBeenCalledWith("contact_id", ["c1"]);
    expect(getMainSupabase).toHaveBeenCalledTimes(3);
  });
});
