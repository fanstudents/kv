import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getSearchOverview, getTrafficOverview, getPipelineOverview, listWeekOverview } = vi.hoisted(() => ({
  getSearchOverview: vi.fn(),
  getTrafficOverview: vi.fn(),
  getPipelineOverview: vi.fn(),
  listWeekOverview: vi.fn(),
}));

vi.mock("@/lib/gsc", () => ({ getSearchOverview }));
vi.mock("@/lib/ga4", () => ({ getTrafficOverview }));
vi.mock("@/adapters/operations/teaching-pipeline-source", () => ({ getPipelineOverview }));
vi.mock("@/lib/google", () => ({ listWeekOverview }));

import { GET as getSearch } from "@/app/api/agents/expense/seo-overview/route";
import { GET as getPipeline } from "@/app/api/agents/operations/pipeline/route";
import { GET as getTraffic } from "@/app/api/agents/report/traffic-overview/route";
import { GET as getWeek } from "@/app/api/agents/schedule/week-overview/route";

beforeEach(() => vi.clearAllMocks());

describe("agent overview route contracts", () => {
  it("keeps successful provider payloads and query day forwarding", async () => {
    getTrafficOverview.mockResolvedValue({ source: "ga4" });
    getSearchOverview.mockResolvedValue({ source: "gsc" });
    getPipelineOverview.mockResolvedValue({ source: "pipeline" });
    listWeekOverview.mockResolvedValue({ source: "calendar" });

    const traffic = await getTraffic(new NextRequest("http://localhost/api/agents/report/traffic-overview?days=14"));
    const search = await getSearch(new NextRequest("http://localhost/api/agents/expense/seo-overview?days=21"));
    await expect(traffic.json()).resolves.toEqual({ ok: true, data: { source: "ga4" } });
    await expect(search.json()).resolves.toEqual({ ok: true, data: { source: "gsc" } });
    await expect((await getPipeline()).json()).resolves.toEqual({ ok: true, data: { source: "pipeline" } });
    await expect((await getWeek()).json()).resolves.toEqual({ ok: true, data: { source: "calendar" } });
    expect(getTrafficOverview).toHaveBeenCalledWith(14);
    expect(getSearchOverview).toHaveBeenCalledWith(21);
  });

  it("keeps the seven-day default and provider error response", async () => {
    getTrafficOverview.mockResolvedValue({ source: "ga4" });
    const defaulted = await getTraffic(new NextRequest("http://localhost/api/agents/report/traffic-overview?days=0"));
    await expect(defaulted.json()).resolves.toEqual({ ok: true, data: { source: "ga4" } });
    expect(getTrafficOverview).toHaveBeenCalledWith(7);

    getPipelineOverview.mockRejectedValue(new Error("provider unavailable"));
    const providerFailure = await getPipeline();
    expect(providerFailure.status).toBe(502);
    await expect(providerFailure.json()).resolves.toEqual({ ok: false, error: "provider unavailable" });

    listWeekOverview.mockRejectedValue("offline");
    const unknownFailure = await getWeek();
    expect(unknownFailure.status).toBe(502);
    await expect(unknownFailure.json()).resolves.toEqual({ ok: false, error: "讀取失敗" });
  });
});
