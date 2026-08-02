import { describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createLegacyVisitRespondSources } from "@/adapters/visit/legacy-respond-sources";

describe("legacy Visit respond read source", () => {
  it("preserves pending_invites reads, optimistic confirmation, and refetch", async () => {
    const query = {
      select: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle
      .mockResolvedValueOnce({ data: { id: "i1", status: "pending" } })
      .mockResolvedValueOnce({ data: { id: "i1", status: "confirmed", chosen_slot: "1" } })
      .mockResolvedValueOnce({ data: { id: "i1", status: "confirmed", contacts: { name: "Dennis" } } });
    query.single.mockResolvedValue({ data: { id: "i1", status: "confirmed", chosen_slot: "1" } });
    const client = { from: vi.fn(() => query) };
    getMainSupabase.mockReturnValue(client);
    const adapter = createLegacyVisitRespondSources().read;

    await expect(adapter.findInvite("i1")).resolves.toEqual({ id: "i1", status: "pending" });
    await expect(adapter.confirmInvite("i1", "1", "2026-07-31T00:00:00.000Z")).resolves.toEqual({
      id: "i1",
      status: "confirmed",
      chosen_slot: "1",
    });
    await expect(adapter.refetchInvite("i1")).resolves.toEqual({ id: "i1", status: "confirmed", chosen_slot: "1" });
    await expect(adapter.findInviteForFulfilment("i1")).resolves.toEqual({
      id: "i1",
      status: "confirmed",
      contacts: { name: "Dennis" },
    });
    expect(client.from).toHaveBeenCalledWith("pending_invites");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.update).toHaveBeenCalledWith({ status: "confirmed", chosen_slot: "1", resolved_at: "2026-07-31T00:00:00.000Z" });
    expect(query.eq).toHaveBeenCalledWith("status", "pending");
    expect(query.select).toHaveBeenCalledWith("*, contacts(name, title, email, company)");
  });

  it("shares one lazy client across the still-separate read and fulfilment ports", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "i1", status: "pending" } }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    getMainSupabase.mockClear();
    getMainSupabase.mockReturnValue({ from: vi.fn(() => query) });
    const sources = createLegacyVisitRespondSources();

    await sources.read.findInvite("i1");
    await sources.fulfilment.recordActivity({ summary: "done", status: "success" });

    expect(getMainSupabase).toHaveBeenCalledOnce();
    expect(query.insert).toHaveBeenCalledWith({ agent_slug: "visit", summary: "done", status: "success" });
  });
});
