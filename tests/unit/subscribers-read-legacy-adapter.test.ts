import { describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacySubscribersReadAdapter } from "@/adapters/subscribers/legacy-read-adapter";

describe("createLegacySubscribersReadAdapter", () => {
  it("keeps the legacy subscriber projection and ordering", async () => {
    const response = Promise.resolve({
      data: [{ id: "s1", tags: ["vip"] }],
      error: null,
    });
    const query = {
      select: vi.fn(),
      order: vi.fn(),
      then: response.then.bind(response),
    };
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const from = vi.fn(() => query);
    getSupabase.mockReturnValue({ from });

    await expect(createLegacySubscribersReadAdapter().list()).resolves.toEqual({
      data: [{ id: "s1", tags: ["vip"] }],
      error: null,
    });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("line_subscribers");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.order).toHaveBeenCalledWith("last_seen_at", { ascending: false });
  });
});
