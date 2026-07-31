import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyContactsReadAdapter } from "@/adapters/contacts/legacy-read-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Contacts read adapter", () => {
  it("keeps the nested select and newest-first query", async () => {
    const response = Promise.resolve({
      data: [{ id: "c1", visit_offers: [], pending_invites: [] }],
      error: null,
    });
    const query = {
      order: vi.fn(),
      then: response.then.bind(response),
    };
    query.order.mockReturnValue(query);
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    getSupabase.mockReturnValue({ from });

    await expect(createLegacyContactsReadAdapter().list()).resolves.toEqual({
      data: [{ id: "c1", visit_offers: [], pending_invites: [] }],
      error: null,
    });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("contacts");
    expect(select).toHaveBeenCalledWith(
      "*, visit_offers(status, created_at, resolved_at), pending_invites(id, status, subject, body, slot1, slot2, chosen_slot, location, calendar_event_id, to_email, created_at, resolved_at)",
    );
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });
});
