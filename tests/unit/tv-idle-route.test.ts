import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createTvIdleDataSources, dataSources } = vi.hoisted(() => {
  const dataSources = {
    listWeekOverview: vi.fn(),
    getAvailableTags: vi.fn(),
    listRecentActivity: vi.fn(),
  };
  return { createTvIdleDataSources: vi.fn(() => dataSources), dataSources };
});

vi.mock("@/adapters/tv/tv-idle-data-sources", () => ({ createTvIdleDataSources }));

import { GET } from "@/app/api/tv/idle/route";

beforeEach(() => {
  vi.clearAllMocks();
  dataSources.listWeekOverview.mockResolvedValue({ dayCounts: [], upcoming: [], warnings: [] });
  dataSources.getAvailableTags.mockResolvedValue(["vip"]);
  dataSources.listRecentActivity.mockResolvedValue([]);
});

describe("TV idle route contract", () => {
  it("keeps an unknown agent at 400 without reading a source", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tv/idle?agent=orders"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "unknown agent" });
    expect(dataSources.listWeekOverview).not.toHaveBeenCalled();
    expect(dataSources.getAvailableTags).not.toHaveBeenCalled();
    expect(dataSources.listRecentActivity).not.toHaveBeenCalled();
  });

  it("keeps the Visit data envelope", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tv/idle?agent=visit"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { tags: ["vip"] } });
    expect(dataSources.getAvailableTags).toHaveBeenCalledOnce();
  });

  it("keeps provider failures on the front-end fallback response", async () => {
    dataSources.getAvailableTags.mockRejectedValueOnce(new Error("source unavailable"));

    const response = await GET(new NextRequest("http://localhost/api/tv/idle?agent=visit"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: false, data: null });
  });
});
