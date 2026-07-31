import { describe, expect, it, vi } from "vitest";

const { listWeekOverview, getAvailableTags, getSupabase } = vi.hoisted(() => ({
  listWeekOverview: vi.fn(),
  getAvailableTags: vi.fn(),
  getSupabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/google", () => ({ listWeekOverview }));
vi.mock("@/lib/contact-tags", () => ({ getAvailableTags }));
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyTvIdleAdapter } from "@/adapters/tv/legacy-idle-adapter";

describe("legacy TV idle adapter", () => {
  it("keeps calendar/tags helpers and the activity query behind the port", async () => {
    const query = {
      select: vi.fn(),
      gte: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({ data: [{ agent_slug: "visit", status: "success" }] }),
    };
    query.select.mockReturnValue(query);
    query.gte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const client = { from: vi.fn(() => query) };
    getSupabase.mockReturnValue(client);
    listWeekOverview.mockResolvedValue({ dayCounts: [], upcoming: [], warnings: [] });
    getAvailableTags.mockResolvedValue(["vip"]);
    const adapter = createLegacyTvIdleAdapter();

    await expect(adapter.listWeekOverview()).resolves.toEqual({ dayCounts: [], upcoming: [], warnings: [] });
    await expect(adapter.getAvailableTags()).resolves.toEqual(["vip"]);
    await expect(adapter.listRecentActivity("cutoff")).resolves.toEqual([{ agent_slug: "visit", status: "success" }]);
    expect(getAvailableTags).toHaveBeenCalledWith(client);
    expect(client.from).toHaveBeenCalledWith("line_agent_activity");
    expect(query.select).toHaveBeenCalledWith("agent_slug,status,occurred_at");
    expect(query.gte).toHaveBeenCalledWith("occurred_at", "cutoff");
    expect(query.order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(500);
  });
});
