import { describe, expect, it } from "vitest";
import { runSupportReport } from "@/modules/support/reporting-application";
import type { SupportConversation } from "@/modules/support/daily-report";
import type {
  SupportReportActivity,
  SupportReportDelivery,
  SupportReportPorts,
} from "@/modules/support/reporting-ports";

const fixedNow = new Date("2026-07-31T01:00:00.000Z");

function createPorts(options?: {
  config?: { enabled?: boolean | null; settings?: unknown } | null;
  messages?: SupportConversation[];
  names?: ReadonlyMap<string, string | null>;
  summary?: string | null;
  deliveryError?: unknown;
}) {
  const calls: string[] = [];
  const activities: SupportReportActivity[] = [];
  const deliveries: SupportReportDelivery[] = [];
  const ports: SupportReportPorts = {
    repository: {
      async getAgentConfig() {
        calls.push("config");
        return options?.config ?? {
          enabled: true,
          settings: { reportTo: "UOWNER", pushStyle: "flex" },
        };
      },
      async listCustomerMessages(cutoff) {
        calls.push(`messages:${cutoff}`);
        return options?.messages ?? [];
      },
      async getDisplayNames(userIds) {
        calls.push(`names:${userIds.join(",")}`);
        return options?.names ?? new Map();
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
  };
  return { ports, calls, activities, deliveries };
}

const clock = {
  nowMs: () => fixedNow.getTime(),
  nowDate: () => fixedNow,
};

const customerMessage: SupportConversation = {
  line_user_id: "UCUSTOMER",
  text: "請問訂單進度",
  occurred_at: "2026-07-31T00:00:00.000Z",
};

describe("Amber Support reporting application", () => {
  it("stops before message work when the Agent is disabled", async () => {
    const fixture = createPorts({ config: { enabled: false } });

    await expect(
      runSupportReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "客服 Agent 已停用，略過匯報" });
    expect(fixture.calls).toEqual(["config"]);
  });

  it("stops before message work when no recipient is configured", async () => {
    const fixture = createPorts({ config: { settings: {} } });

    await expect(
      runSupportReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "尚未設定匯報對象（reportTo）" });
    expect(fixture.calls).toEqual(["config"]);
  });

  it("skips names and summary for an empty day", async () => {
    const fixture = createPorts({ messages: [] });

    await expect(
      runSupportReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({
      ok: true,
      message: "客服彙報已送出（0 位客戶、0 則留言）",
    });
    expect(fixture.calls).toEqual([
      "config",
      "messages:2026-07-30T01:00:00.000Z",
      "delivery",
      "record:success",
    ]);
    expect(fixture.deliveries[0].text).toContain(
      "過去 24 小時客服官方帳號沒有收到新的客戶留言"
    );
  });

  it("preserves message, names, summary, delivery, and record ordering", async () => {
    const fixture = createPorts({
      messages: [customerMessage],
      names: new Map([["UCUSTOMER", "王小明"]]),
      summary: "AI 客服摘要",
    });

    await expect(
      runSupportReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({
      ok: true,
      message: "客服彙報已送出（1 位客戶、1 則留言）",
    });
    expect(fixture.calls.map((call) => call.split(":")[0])).toEqual([
      "config",
      "messages",
      "names",
      "summary",
      "delivery",
      "record",
    ]);
    expect(fixture.deliveries[0]).toMatchObject({
      recipient: "UOWNER",
      title: "客服 Agent・每日彙報",
      accentColor: "#EC4899",
    });
    expect(fixture.deliveries[0].text).toContain("AI 客服摘要");
    expect(fixture.activities).toEqual([
      {
        summary: "已向老闆送出每日客服彙報（1 位客戶、1 則留言）",
        status: "success",
      },
    ]);
  });

  it("maps delivery errors to the current failed activity and result", async () => {
    const fixture = createPorts({
      messages: [customerMessage],
      deliveryError: new Error("LINE unavailable"),
    });

    await expect(
      runSupportReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "LINE unavailable" });
    expect(fixture.activities).toEqual([
      {
        summary: "每日客服彙報推播失敗：LINE unavailable",
        status: "failed",
      },
    ]);
  });

  it("preserves the non-Error delivery fallback", async () => {
    const fixture = createPorts({ deliveryError: "offline" });

    await expect(
      runSupportReport({ ports: fixture.ports, clock })
    ).resolves.toEqual({ ok: false, message: "推播失敗" });
  });
});
