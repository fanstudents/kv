import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase, getLineProfile } = vi.hoisted(() => ({
  getMainSupabase: vi.fn(),
  getLineProfile: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));
vi.mock("@/lib/line", () => ({ getLineProfile }));

import { supabaseSubscribersRepository } from "@/adapters/subscribers/supabase-subscribers-repository";

beforeEach(() => vi.clearAllMocks());

describe("Supabase Subscribers repository", () => {
  it("keeps the subscriber projection and ordering", async () => {
    const response = Promise.resolve({ data: [{ id: "s1", tags: ["vip"] }], error: null });
    const query = { select: vi.fn(), order: vi.fn(), then: response.then.bind(response) };
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const from = vi.fn(() => query);
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseSubscribersRepository.list()).resolves.toEqual({
      data: [{ id: "s1", tags: ["vip"] }],
      error: null,
    });
    expect(from).toHaveBeenCalledWith("line_subscribers");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.order).toHaveBeenCalledWith("last_seen_at", { ascending: false });
  });

  it("keeps the update/equality/select/single chain", async () => {
    const response = Promise.resolve({ data: { id: "s1" }, error: null });
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
      then: response.then.bind(response),
    };
    query.update.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.single.mockReturnValue(query);
    getMainSupabase.mockReturnValue({ from: vi.fn(() => query) });

    await expect(supabaseSubscribersRepository.update("s1", { tags: ["vip"] })).resolves.toEqual({
      data: { id: "s1" },
      error: null,
    });
    expect(query.update).toHaveBeenCalledWith({ tags: ["vip"] });
    expect(query.eq).toHaveBeenCalledWith("id", "s1");
  });

  it("touches an existing subscriber without refetching a known profile", async () => {
    const existingQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "s1", display_name: "Known" } }),
    };
    existingQuery.select.mockReturnValue(existingQuery);
    existingQuery.eq.mockReturnValue(existingQuery);
    const updateQuery = { update: vi.fn(), eq: vi.fn().mockResolvedValue({ error: null }) };
    updateQuery.update.mockReturnValue(updateQuery);
    const from = vi.fn()
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(updateQuery);
    getMainSupabase.mockReturnValue({ from });

    await supabaseSubscribersRepository.touch("U1", "primary");
    expect(updateQuery.update).toHaveBeenCalledWith({ last_seen_at: expect.any(String) });
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "s1");
    expect(getLineProfile).not.toHaveBeenCalled();
  });

  it("creates a new subscriber with the available LINE profile", async () => {
    const existingQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    existingQuery.select.mockReturnValue(existingQuery);
    existingQuery.eq.mockReturnValue(existingQuery);
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn()
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce({ insert });
    getMainSupabase.mockReturnValue({ from });
    getLineProfile.mockResolvedValue({ displayName: "Alice", pictureUrl: "https://example.com/a.png" });

    await supabaseSubscribersRepository.touch("U1", "support");
    expect(getLineProfile).toHaveBeenCalledWith("U1", "support");
    expect(insert).toHaveBeenCalledWith({
      line_user_id: "U1",
      channel: "support",
      display_name: "Alice",
      picture_url: "https://example.com/a.png",
    });
  });
});
