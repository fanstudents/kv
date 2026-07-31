import { describe, expect, it, vi } from "vitest";
import { createTvIdleReadModel, parseTvIdleAgent, type TvIdleDataSources } from "@/modules/tv/idle";

const week = { dayCounts: [1, 0, 0, 0, 0, 0, 0], upcoming: [], warnings: [] };

function sources(overrides: Partial<TvIdleDataSources> = {}): TvIdleDataSources {
  return {
    listWeekOverview: vi.fn().mockResolvedValue(week),
    getAvailableTags: vi.fn().mockResolvedValue(["vip"]),
    listRecentActivity: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("TV idle read model", () => {
  it("keeps the three supported query values", () => {
    expect(parseTvIdleAgent("schedule")).toBe("schedule");
    expect(parseTvIdleAgent("visit")).toBe("visit");
    expect(parseTvIdleAgent("teamlead")).toBe("teamlead");
  });

  it("maps missing and unknown values to the existing unknown branch", () => {
    expect(parseTvIdleAgent(null)).toBe("unknown");
    expect(parseTvIdleAgent("")).toBe("unknown");
    expect(parseTvIdleAgent("orders")).toBe("unknown");
  });

  it("preserves schedule data and the ten-minute cache envelope", async () => {
    const dataSources = sources();
    const readModel = createTvIdleReadModel(dataSources);

    await expect(readModel.read("schedule")).resolves.toEqual({ kind: "schedule", data: week, cached: false });
    await expect(readModel.read("schedule")).resolves.toEqual({ kind: "schedule", data: week, cached: true });
    expect(dataSources.listWeekOverview).toHaveBeenCalledOnce();
  });

  it("returns Visit tags without changing the data envelope", async () => {
    const dataSources = sources();
    await expect(createTvIdleReadModel(dataSources).read("visit")).resolves.toEqual({ kind: "visit", data: { tags: ["vip"] } });
    expect(dataSources.getAvailableTags).toHaveBeenCalledOnce();
  });

  it("preserves Teamlead counts, failure count, top-three ordering, and cutoff", async () => {
    const dataSources = sources({
      listRecentActivity: vi.fn().mockResolvedValue([
        { agent_slug: "visit", status: "success" },
        { agent_slug: "visit", status: "failed" },
        { agent_slug: "support", status: "success" },
        { agent_slug: null, status: "failed" },
      ]),
    });
    const result = await createTvIdleReadModel(dataSources).read("teamlead");
    expect(result).toEqual({
      kind: "teamlead",
      data: { total: 4, failed: 2, top: [{ slug: "visit", count: 2 }, { slug: "support", count: 1 }] },
    });
    expect(dataSources.listRecentActivity).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  it("keeps the unknown-agent branch separate from provider work", async () => {
    const dataSources = sources();
    await expect(createTvIdleReadModel(dataSources).read("unknown")).resolves.toEqual({ kind: "unknown" });
    expect(dataSources.listWeekOverview).not.toHaveBeenCalled();
    expect(dataSources.getAvailableTags).not.toHaveBeenCalled();
    expect(dataSources.listRecentActivity).not.toHaveBeenCalled();
  });
});
