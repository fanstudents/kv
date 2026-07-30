import { describe, expect, it } from "vitest";
import { processOrderPayload } from "@/modules/orders/application";
import type {
  OrdersActivity,
  OrdersAgentConfig,
  OrdersPorts,
} from "@/modules/orders/ports";

const payload = {
  id: "order-1",
  trade_no: "T-1",
  amount: 1680,
  currency: "TWD",
  user_name: "Dennis",
  user_email: "dennis@example.test",
  items: [{ name: "產品化工作坊" }],
};

function fakePorts(params?: {
  config?: OrdersAgentConfig | null;
  deliveryError?: unknown;
}) {
  const calls: string[] = [];
  const activities: OrdersActivity[] = [];
  const ports: OrdersPorts = {
    repository: {
      async upsertOrder(order) {
        calls.push(`upsert:${order.id}`);
      },
      async getAgentConfig() {
        calls.push("config");
        return params?.config ?? { enabled: true, settings: { reportTo: "U123" } };
      },
      async recordActivity(activity) {
        calls.push(`activity:${activity.status}`);
        activities.push(activity);
      },
    },
    delivery: {
      async deliver(notification) {
        calls.push(`deliver:${notification.recipient}`);
        if (params && "deliveryError" in params) throw params.deliveryError;
      },
    },
  };
  return { ports, calls, activities };
}

describe("Orders application", () => {
  it("records unrecognized payloads without persistence or delivery", async () => {
    const { ports, calls, activities } = fakePorts();
    const rawBody = `{"unknown":"${"x".repeat(600)}"}`;

    await expect(processOrderPayload({ payload: {}, rawBody, ports })).resolves.toEqual({
      type: "unrecognized",
    });
    expect(calls).toEqual(["activity:failed"]);
    expect(activities[0].summary).toBe(
      `收到 Teachify Webhook 但無法解析訂單欄位，原始內容：${rawBody.slice(0, 500)}`
    );
  });

  it("persists before checking an explicitly disabled Agent", async () => {
    const { ports, calls } = fakePorts({ config: { enabled: false } });

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), ports })
    ).resolves.toEqual({ type: "disabled" });
    expect(calls).toEqual(["upsert:order-1", "config"]);
  });

  it("records a missing recipient after persistence and config lookup", async () => {
    const { ports, calls, activities } = fakePorts({
      config: { enabled: true, settings: { reportTo: " " } },
    });

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), ports })
    ).resolves.toEqual({ type: "missing_recipient" });
    expect(calls).toEqual(["upsert:order-1", "config", "activity:failed"]);
    expect(activities[0].summary).toContain("尚未設定通知對象");
  });

  it("delivers and records success in the existing order", async () => {
    const { ports, calls, activities } = fakePorts();

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), ports })
    ).resolves.toEqual({ type: "delivered" });
    expect(calls).toEqual([
      "upsert:order-1",
      "config",
      "deliver:U123",
      "activity:success",
    ]);
    expect(activities[0].summary).toBe(
      "新訂單通知已送出：Dennis / 產品化工作坊 / TWD 1680"
    );
  });

  it("converts only delivery errors to the existing failed outcome", async () => {
    const { ports, calls, activities } = fakePorts({
      deliveryError: new Error("LINE unavailable"),
    });

    await expect(
      processOrderPayload({ payload, rawBody: JSON.stringify(payload), ports })
    ).resolves.toEqual({ type: "delivery_failed", message: "LINE unavailable" });
    expect(calls).toEqual([
      "upsert:order-1",
      "config",
      "deliver:U123",
      "activity:failed",
    ]);
    expect(activities[0].summary).toBe("訂單通知推播失敗：LINE unavailable");
  });
});
