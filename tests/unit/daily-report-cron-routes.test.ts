import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { runSupportDailyReport, runTeamLeadReport } = vi.hoisted(() => ({
  runSupportDailyReport: vi.fn(),
  runTeamLeadReport: vi.fn(),
}));

vi.mock("@/adapters/reporting/daily-report-runners", () => ({
  runSupportDailyReport,
  runTeamLeadReport,
}));

import { GET as getSupportDailyReport } from "@/app/api/cron/support-daily-report/route";
import { GET as getTeamLeadReport } from "@/app/api/cron/team-lead-report/route";

const originalCronSecret = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

function request(path: string, secret?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: secret ? { "x-cron-key": secret } : undefined,
  });
}

describe("daily report cron route contracts", () => {
  it("fails closed before either report runner when the cron secret is missing or wrong", async () => {
    const missing = await getTeamLeadReport(request("/api/cron/team-lead-report"));
    expect(missing.status).toBe(503);
    await expect(missing.json()).resolves.toEqual({ error: "server misconfigured: CRON_SECRET not set" });

    process.env.CRON_SECRET = "cron-secret";
    const wrong = await getSupportDailyReport(request("/api/cron/support-daily-report", "wrong-secret"));
    expect(wrong.status).toBe(401);
    await expect(wrong.json()).resolves.toEqual({ error: "unauthorized" });
    expect(runTeamLeadReport).not.toHaveBeenCalled();
    expect(runSupportDailyReport).not.toHaveBeenCalled();
  });

  it("keeps each authorized route's success and failure response semantics", async () => {
    process.env.CRON_SECRET = "cron-secret";
    runTeamLeadReport.mockResolvedValue({ ok: true, message: "晨報已送出" });
    runSupportDailyReport.mockResolvedValue({ ok: false, message: "客服日報失敗" });

    const teamLead = await getTeamLeadReport(request("/api/cron/team-lead-report", "cron-secret"));
    expect(teamLead.status).toBe(200);
    await expect(teamLead.json()).resolves.toEqual({ ok: true, message: "晨報已送出" });

    const support = await getSupportDailyReport(request("/api/cron/support-daily-report", "cron-secret"));
    expect(support.status).toBe(500);
    await expect(support.json()).resolves.toEqual({ ok: false, message: "客服日報失敗" });
  });
});
