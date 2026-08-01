import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPipelineOverview } = vi.hoisted(() => ({ getPipelineOverview: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/adapters/operations/teaching-pipeline-source", () => ({ getPipelineOverview }));
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => {
    throw new Error("primary database unavailable");
  },
}));
vi.mock("@/lib/google", () => ({ listWeekOverview: vi.fn() }));
vi.mock("@/lib/gsc", () => ({ getSearchOverview: vi.fn() }));
vi.mock("@/lib/ga4", () => ({ getTrafficOverview: vi.fn() }));
vi.mock("@/lib/teachify-order-stats", () => ({ getOrderRevenueSummary: vi.fn() }));
vi.mock("@/lib/knowledge-base", () => ({ knowledgeContext: vi.fn().mockResolvedValue("") }));
vi.mock("@/lib/agent-data", () => ({ AGENTS: [] }));
vi.mock("@/adapters/operations/supabase-operations-repository", () => ({
  supabaseOperationsRepository: { list: vi.fn() },
}));

import { getAgentLiveContext } from "@/lib/meeting-context";

beforeEach(() => vi.clearAllMocks());

describe("operations meeting context", () => {
  it("keeps Teaching provider failure out of the prompt instead of inventing zero values", async () => {
    getPipelineOverview.mockRejectedValue(new Error("provider unavailable"));

    await expect(getAgentLiveContext("operations")).resolves.toBe("");
  });

  it("keeps the existing successful operations summary wording", async () => {
    getPipelineOverview.mockResolvedValue({
      totalProjects: 2,
      closedProjects: 1,
      enterpriseTrainingCount: 1,
      publicCourseCount: 1,
      recentProjects: [],
      openInquiries: [],
      totalInquiries: 3,
      recentQuotations: [],
      quotationsSentValue: 80_000,
      quotationsDraftValue: 0,
      monthlyTrend: [],
      thisMonthProjects: [],
    });

    const context = await getAgentLiveContext("operations");
    expect(context).toContain("專案總覽：全部 2 個專案，1 個已成案（企業內訓 1 個、公開課程 1 個）。");
    expect(context).toContain("企業顧問洽詢：共 3 筆，0 筆待跟進。");
    expect(context).toContain("報價單：已送出金額 NT$80,000。");
  });
});
