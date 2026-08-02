import { describe, expect, it, vi } from "vitest";

const { listWeekOverview, getAvailableTags, getMainSupabase } = vi.hoisted(() => ({
  listWeekOverview: vi.fn(),
  getAvailableTags: vi.fn(),
  getMainSupabase: vi.fn(),
}));

vi.mock("@/lib/google", () => ({ listWeekOverview }));
vi.mock("@/lib/contact-tags", () => ({ getAvailableTags }));
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createTvIdleDataSources } from "@/adapters/tv/tv-idle-data-sources";

describe("TV idle data sources", () => {
  it("keeps calendar/tags helpers and the activity query boundary", async () => {
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
    getMainSupabase.mockReturnValue(client);
    listWeekOverview.mockResolvedValue({ dayCounts: [], upcoming: [], warnings: [] });
    getAvailableTags.mockResolvedValue(["vip"]);
    const dataSources = createTvIdleDataSources();

    await expect(dataSources.listWeekOverview()).resolves.toEqual({ dayCounts: [], upcoming: [], warnings: [] });
    await expect(dataSources.getAvailableTags()).resolves.toEqual(["vip"]);
    await expect(dataSources.listRecentActivity("cutoff")).resolves.toEqual([{ agent_slug: "visit", status: "success" }]);
    expect(getAvailableTags).toHaveBeenCalledWith(client);
    expect(client.from).toHaveBeenCalledWith("line_agent_activity");
    expect(query.select).toHaveBeenCalledWith("agent_slug,status,occurred_at");
    expect(query.gte).toHaveBeenCalledWith("occurred_at", "cutoff");
    expect(query.order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(500);
  });
});
