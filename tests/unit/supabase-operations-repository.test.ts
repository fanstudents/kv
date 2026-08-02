import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase, getAvailableTags, addContactTag } = vi.hoisted(() => ({
  getMainSupabase: vi.fn(),
  getAvailableTags: vi.fn(),
  addContactTag: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));
vi.mock("@/lib/contact-tags", () => ({ getAvailableTags, addContactTag }));

import { supabaseOperationsRepository } from "@/adapters/operations/supabase-operations-repository";

beforeEach(() => vi.clearAllMocks());

describe("Supabase Operations repository", () => {
  it("keeps the nested Contacts projection and newest-first order", async () => {
    const response = Promise.resolve({
      data: [{ id: "c1", visit_offers: [], pending_invites: [] }],
      error: null,
    });
    const query = { order: vi.fn(), then: response.then.bind(response) };
    query.order.mockReturnValue(query);
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseOperationsRepository.listContacts()).resolves.toEqual({
      data: [{ id: "c1", visit_offers: [], pending_invites: [] }],
      error: null,
    });
    expect(from).toHaveBeenCalledWith("contacts");
    expect(select).toHaveBeenCalledWith(
      "*, visit_offers(status, created_at, resolved_at), pending_invites(id, status, subject, body, slot1, slot2, chosen_slot, location, calendar_event_id, to_email, created_at, resolved_at)",
    );
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("keeps Activity ordering, limit, and optional filters", async () => {
    const response = Promise.resolve({ data: [{ id: "a1" }], error: null });
    const query = {
      limit: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      then: response.then.bind(response),
    };
    query.limit.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const select = vi.fn(() => query);
    const from = vi.fn(() => ({ select }));
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseOperationsRepository.listActivity({
      agentSlug: "visit",
      status: "failed",
      limit: 25,
    })).resolves.toEqual({ data: [{ id: "a1" }], error: null });
    expect(from).toHaveBeenCalledWith("line_agent_activity");
    expect(select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenNthCalledWith(1, "agent_slug", "visit");
    expect(query.order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(query.eq).toHaveBeenNthCalledWith(2, "status", "failed");
  });

  it("does not add empty Activity filters", async () => {
    const response = Promise.resolve({ data: [], error: null });
    const query = {
      limit: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      then: response.then.bind(response),
    };
    query.limit.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    getMainSupabase.mockReturnValue({ from: vi.fn(() => ({ select: vi.fn(() => query) })) });

    await supabaseOperationsRepository.listActivity({ agentSlug: null, status: "", limit: 200 });
    expect(query.eq).not.toHaveBeenCalled();
  });

  it("keeps contact tag reads and writes behind the shared repository", async () => {
    const client = { id: "supabase-client" };
    getMainSupabase.mockReturnValue(client);
    getAvailableTags.mockResolvedValue(["潛在客戶", "合作夥伴"]);
    addContactTag.mockResolvedValue(["潛在客戶", "待跟進"]);

    await expect(supabaseOperationsRepository.list()).resolves.toEqual(["潛在客戶", "合作夥伴"]);
    await expect(supabaseOperationsRepository.add("contact-1", "待跟進")).resolves.toEqual(["潛在客戶", "待跟進"]);
    expect(getAvailableTags).toHaveBeenCalledWith(client);
    expect(addContactTag).toHaveBeenCalledWith(client, "contact-1", "待跟進");
  });
});
