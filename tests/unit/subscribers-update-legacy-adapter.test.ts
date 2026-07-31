import { describe, expect, it, vi } from "vitest";

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacySubscribersUpdateAdapter } from "@/adapters/subscribers/legacy-update-adapter";

describe("createLegacySubscribersUpdateAdapter", () => {
  it("keeps the legacy update/equality/select/single chain", async () => {
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
    const from = vi.fn(() => query);
    getSupabase.mockReturnValue({ from });

    await expect(createLegacySubscribersUpdateAdapter().update("s1", { tags: ["vip"] })).resolves.toEqual({
      data: { id: "s1" },
      error: null,
    });
    expect(getSupabase).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith("line_subscribers");
    expect(query.update).toHaveBeenCalledWith({ tags: ["vip"] });
    expect(query.eq).toHaveBeenCalledWith("id", "s1");
    expect(query.select).toHaveBeenCalledWith();
    expect(query.single).toHaveBeenCalledWith();
  });
});
