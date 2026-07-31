import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const supabase = { kind: "supabase" };
  const supportRepository = { kind: "support-repository" };
  const teamLeadRepository = { kind: "teamlead-repository" };
  const supportSummary = { kind: "support-summary" };
  const teamLeadSummary = { kind: "teamlead-summary" };
  const delivery = { kind: "delivery" };

  return {
    supabase,
    supportRepository,
    teamLeadRepository,
    supportSummary,
    teamLeadSummary,
    delivery,
    getSupabase: vi.fn(),
    createSupabaseSupportReportRepository: vi.fn(),
    createSupabaseTeamLeadReportRepository: vi.fn(),
    createOpenAiDailyReportSummaryProvider: vi.fn(),
    createLineDailyReportDelivery: vi.fn(),
    runSupportReport: vi.fn(),
    runDailyTeamLeadReport: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase: mocks.getSupabase }));
vi.mock("@/lib/agent-data", () => ({
  AGENTS: [{ slug: "visit", personZh: "可可", name: "Coco" }],
}));
vi.mock("@/adapters/support/supabase-support-report-repository", () => ({
  createSupabaseSupportReportRepository: mocks.createSupabaseSupportReportRepository,
}));
vi.mock("@/adapters/reporting/supabase-team-lead-report-repository", () => ({
  createSupabaseTeamLeadReportRepository: mocks.createSupabaseTeamLeadReportRepository,
}));
vi.mock("@/adapters/reporting/openai-daily-report-summary-provider", () => ({
  createOpenAiDailyReportSummaryProvider: mocks.createOpenAiDailyReportSummaryProvider,
}));
vi.mock("@/adapters/reporting/line-daily-report-delivery", () => ({
  createLineDailyReportDelivery: mocks.createLineDailyReportDelivery,
}));
vi.mock("@/modules/support/report", () => ({
  SUPPORT_REPORT_SUMMARY_CONFIG: { kind: "support-config" },
  runSupportReport: mocks.runSupportReport,
}));
vi.mock("@/modules/reporting/team-lead", () => ({
  TEAM_LEAD_REPORT_SUMMARY_CONFIG: { kind: "teamlead-config" },
  runDailyTeamLeadReport: mocks.runDailyTeamLeadReport,
}));

import {
  runSupportDailyReport,
  runTeamLeadReport,
} from "@/adapters/reporting/daily-report-runners";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSupabase.mockReturnValue(mocks.supabase);
  mocks.createSupabaseSupportReportRepository.mockReturnValue(mocks.supportRepository);
  mocks.createSupabaseTeamLeadReportRepository.mockReturnValue(mocks.teamLeadRepository);
  mocks.createOpenAiDailyReportSummaryProvider.mockImplementation((config) =>
    config.kind === "support-config" ? mocks.supportSummary : mocks.teamLeadSummary
  );
  mocks.createLineDailyReportDelivery.mockReturnValue(mocks.delivery);
});

describe("Daily report runner composition", () => {
  it("composes the existing Support workflow with its own repository and summary config", async () => {
    const result = { ok: true, message: "客服日報已送出" };
    mocks.runSupportReport.mockResolvedValue(result);

    await expect(runSupportDailyReport()).resolves.toEqual(result);

    expect(mocks.createSupabaseSupportReportRepository).toHaveBeenCalledWith(mocks.supabase);
    expect(mocks.createOpenAiDailyReportSummaryProvider).toHaveBeenCalledWith({ kind: "support-config" });
    expect(mocks.createLineDailyReportDelivery).toHaveBeenCalledTimes(1);
    const input = mocks.runSupportReport.mock.calls[0][0];
    expect(input.dependencies).toEqual({
      repository: mocks.supportRepository,
      summary: mocks.supportSummary,
      delivery: mocks.delivery,
    });
    expect(input.clock.nowMs()).toEqual(expect.any(Number));
    expect(input.clock.nowDate()).toBeInstanceOf(Date);
  });

  it("composes the existing Team Lead workflow without changing its Agent presentation fallback", async () => {
    const result = { ok: true, message: "晨報已送出" };
    mocks.runDailyTeamLeadReport.mockResolvedValue(result);

    await expect(runTeamLeadReport()).resolves.toEqual(result);

    expect(mocks.createSupabaseTeamLeadReportRepository).toHaveBeenCalledWith(mocks.supabase);
    expect(mocks.createOpenAiDailyReportSummaryProvider).toHaveBeenCalledWith({ kind: "teamlead-config" });
    expect(mocks.createLineDailyReportDelivery).toHaveBeenCalledTimes(1);
    const input = mocks.runDailyTeamLeadReport.mock.calls[0][0];
    expect(input.dependencies.repository).toBe(mocks.teamLeadRepository);
    expect(input.dependencies.summary).toBe(mocks.teamLeadSummary);
    expect(input.dependencies.delivery).toBe(mocks.delivery);
    expect(input.dependencies.displayName("visit")).toBe("可可（Coco）");
    expect(input.dependencies.displayName("unknown")).toBe("unknown");
    expect(input.clock.nowMs()).toEqual(expect.any(Number));
    expect(input.clock.nowDate()).toBeInstanceOf(Date);
  });
});
