import { describe, expect, it } from "vitest";
import { runDailyTeamLeadReport } from "@/modules/reporting/application";
import type {
  ReportingActivityWrite,
  ReportingDelivery,
  ReportingPorts,
} from "@/modules/reporting/ports";
import type { ReportingActivity } from "@/modules/reporting/daily-report";

const fixedNow = new Date("2026-07-31T01:00:00.000Z");

function createPorts(options?: {
  config?: { enabled?: boolean | null; settings?: unknown } | null;
  rows?: ReportingActivity[];
  summary?: string | null;
  deliveryError?: unknown;
}) {
  const calls: string[] = [];
  const activities: ReportingActivityWrite[] = [];
  const deliveries: ReportingDelivery[] = [];
  const ports: ReportingPorts = {
    repository: {
      async getAgentConfig() {
        calls.push("config");
        return options?.config ?? {
          enabled: true,
          settings: { reportTo: "U123", pushStyle: "flex" },
        };
      },
      async listActivities(cutoff) {
        calls.push(`activities:${cutoff}`);
        return options?.rows ?? [];
      },
      async recordActivity(activity) {
        calls.push(`record:${activity.status}`);
        activities.push(activity);
      },
    },
    summary: {
      async summarize(rawBrief) {
        calls.push(`summary:${rawBrief}`);
        return options?.summary ?? null;
      },
    },
    delivery: {
      async deliver(notification) {
        calls.push("delivery");
        if (options?.deliveryError !== undefined) throw options.deliveryError;
        deliveries.push(notification);
      },
    },
    roster: {
      displayName(slug) {
        return `Agent ${slug}`;
      },
    },
  };

  return { ports, calls, activities, deliveries };
}

const clock = {
  nowMs: () => fixedNow.getTime(),
  nowDate: () => fixedNow,
};

describe("Vivian reporting application", () => {
  it("stops before activity work when the Agent is disabled", async () => {
    const fixture = createPorts({ config: { enabled: false } });

    await expect(
      runDailyTeamLeadReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "總管 Agent 已停用，略過匯報" });
    expect(fixture.calls).toEqual(["config"]);
  });

  it("stops before activity work when no recipient is configured", async () => {
    const fixture = createPorts({ config: { settings: {} } });

    await expect(
      runDailyTeamLeadReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "尚未設定匯報對象（reportTo）" });
    expect(fixture.calls).toEqual(["config"]);
  });

  it("delivers the empty-day fallback without calling the summary provider", async () => {
    const fixture = createPorts({ rows: [] });

    await expect(
      runDailyTeamLeadReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: true, message: "晨報已送出，彙整 0 筆團隊動態" });
    expect(fixture.calls).toEqual([
      "config",
      "activities:2026-07-30T01:00:00.000Z",
      "delivery",
      "record:success",
    ]);
    expect(fixture.deliveries[0]).toMatchObject({
      recipient: "U123",
      style: "flex",
      title: "總管 Agent・每日晨報",
      accentColor: "#475569",
    });
    expect(fixture.deliveries[0].text).toContain("過去 24 小時團隊沒有新的執行紀錄");
    expect(fixture.activities).toEqual([
      {
        summary: "已向老闆送出每日晨報（彙整 0 筆團隊動態）",
        status: "success",
      },
    ]);
  });

  it("preserves activity, summary, delivery, and success-record ordering", async () => {
    const fixture = createPorts({
      rows: [
        {
          agent_slug: "visit",
          occurred_at: "2026-07-31T00:00:00.000Z",
          summary: "完成拜訪",
          status: "success",
        },
      ],
      summary: "AI 摘要",
    });

    await expect(
      runDailyTeamLeadReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: true, message: "晨報已送出，彙整 1 筆團隊動態" });
    expect(fixture.calls.map((call) => call.split(":")[0])).toEqual([
      "config",
      "activities",
      "summary",
      "delivery",
      "record",
    ]);
    expect(fixture.deliveries[0].text).toContain("AI 摘要");
  });

  it("maps delivery errors to the current failed activity and result", async () => {
    const fixture = createPorts({
      deliveryError: new Error("LINE unavailable"),
    });

    await expect(
      runDailyTeamLeadReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "LINE unavailable" });
    expect(fixture.activities).toEqual([
      {
        summary: "每日匯報推播失敗：LINE unavailable",
        status: "failed",
      },
    ]);
  });

  it("preserves the non-Error delivery fallback", async () => {
    const fixture = createPorts({ deliveryError: "offline" });

    await expect(
      runDailyTeamLeadReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "推播失敗" });
  });
});
