import { describe, expect, it, vi } from "vitest";

const { getSearchOverview, getTrafficOverview, getPipelineOverview, listWeekOverview } = vi.hoisted(() => ({
  getSearchOverview: vi.fn(),
  getTrafficOverview: vi.fn(),
  getPipelineOverview: vi.fn(),
  listWeekOverview: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gsc", () => ({ getSearchOverview }));
vi.mock("@/lib/ga4", () => ({ getTrafficOverview }));
vi.mock("@/lib/teaching-system", () => ({ getPipelineOverview }));
vi.mock("@/lib/google", () => ({ listWeekOverview }));

import { createLegacyPipelineOverviewAdapter } from "@/adapters/agents/legacy-pipeline-overview-adapter";
import { createLegacySearchOverviewAdapter } from "@/adapters/agents/legacy-search-overview-adapter";
import { createLegacyTrafficOverviewAdapter } from "@/adapters/agents/legacy-traffic-overview-adapter";
import { createLegacyWeekOverviewAdapter } from "@/adapters/agents/legacy-week-overview-adapter";

describe("legacy agent overview adapters", () => {
  it("keeps Search Console and GA4 day ranges", async () => {
    getSearchOverview.mockResolvedValue({ source: "gsc" });
    getTrafficOverview.mockResolvedValue({ source: "ga4" });

    await expect(createLegacySearchOverviewAdapter().read(21)).resolves.toEqual({ source: "gsc" });
    await expect(createLegacyTrafficOverviewAdapter().read(30)).resolves.toEqual({ source: "ga4" });
    expect(getSearchOverview).toHaveBeenCalledWith(21);
    expect(getTrafficOverview).toHaveBeenCalledWith(30);
  });

  it("keeps pipeline and calendar providers as read-only calls", async () => {
    getPipelineOverview.mockResolvedValue({ source: "pipeline" });
    listWeekOverview.mockResolvedValue({ source: "calendar" });

    await expect(createLegacyPipelineOverviewAdapter().read()).resolves.toEqual({ source: "pipeline" });
    await expect(createLegacyWeekOverviewAdapter().read()).resolves.toEqual({ source: "calendar" });
    expect(getPipelineOverview).toHaveBeenCalledOnce();
    expect(listWeekOverview).toHaveBeenCalledOnce();
  });
});
