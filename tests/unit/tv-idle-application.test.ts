import { describe, expect, it, vi } from "vitest";
import type { TvIdlePort } from "@/modules/tv/idle-ports";
import { createTvIdleApplication } from "@/modules/tv/idle-application";

const week = { dayCounts: [1, 0, 0, 0, 0, 0, 0], upcoming: [], warnings: [] };

function port(overrides: Partial<TvIdlePort> = {}): TvIdlePort {
  return {
    listWeekOverview: vi.fn().mockResolvedValue(week),
    getAvailableTags: vi.fn().mockResolvedValue(["vip"]),
    listRecentActivity: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("TV idle application", () => {
  it("preserves schedule data and the ten-minute cache envelope", async () => {
    const p = port();
    const app = createTvIdleApplication(p);

    await expect(app.run("schedule")).resolves.toEqual({ kind: "schedule", data: week, cached: false });
    await expect(app.run("schedule")).resolves.toEqual({ kind: "schedule", data: week, cached: true });
    expect(p.listWeekOverview).toHaveBeenCalledOnce();
  });

  it("returns Visit tags without changing the data envelope", async () => {
    const p = port();
    await expect(createTvIdleApplication(p).run("visit")).resolves.toEqual({ kind: "visit", data: { tags: ["vip"] } });
    expect(p.getAvailableTags).toHaveBeenCalledOnce();
  });

  it("preserves Teamlead counts, failure count, top-three ordering, and cutoff", async () => {
    const p = port({
      listRecentActivity: vi.fn().mockResolvedValue([
        { agent_slug: "visit", status: "success" },
        { agent_slug: "visit", status: "failed" },
        { agent_slug: "support", status: "success" },
        { agent_slug: null, status: "failed" },
      ]),
    });
    const result = await createTvIdleApplication(p).run("teamlead");
    expect(result).toEqual({
      kind: "teamlead",
      data: { total: 4, failed: 2, top: [{ slug: "visit", count: 2 }, { slug: "support", count: 1 }] },
    });
    expect(p.listRecentActivity).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  it("keeps the unknown-agent branch separate from provider work", async () => {
    const p = port();
    await expect(createTvIdleApplication(p).run("unknown")).resolves.toEqual({ kind: "unknown" });
    expect(p.listWeekOverview).not.toHaveBeenCalled();
    expect(p.getAvailableTags).not.toHaveBeenCalled();
    expect(p.listRecentActivity).not.toHaveBeenCalled();
  });
});
