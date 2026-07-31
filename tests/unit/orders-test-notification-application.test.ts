import { describe, expect, it } from "vitest";
import { runOrderTestNotification } from "@/modules/orders/test-notification-application";
import type { OrdersTestNotificationPort } from "@/modules/orders/test-notification-ports";

function fakePort(config: { reportTo?: string; pushStyle?: string } | null, deliveryError?: unknown) {
  const calls: string[] = [];
  const port: OrdersTestNotificationPort = {
    async getAgentConfig() {
      calls.push("config");
      return config ? { settings: config } : null;
    },
    async send(delivery) {
      calls.push(`send:${delivery.recipient}:${delivery.style}`);
      if (deliveryError !== undefined) throw deliveryError;
    },
    async recordActivity(activity) {
      calls.push(`activity:${activity.status}:${activity.summary}`);
    },
  };
  return { port, calls };
}

describe("runOrderTestNotification", () => {
  it("returns the existing missing-recipient response without delivery", async () => {
    const { port, calls } = fakePort({ reportTo: " " });
    await expect(runOrderTestNotification(port)).resolves.toEqual({
      kind: "missing-recipient",
      message: "尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定",
    });
    expect(calls).toEqual(["config"]);
  });

  it("delivers and records the existing success activity", async () => {
    const { port, calls } = fakePort({ reportTo: "U123", pushStyle: "text" });
    await expect(runOrderTestNotification(port)).resolves.toEqual({
      kind: "success",
      message: "測試通知已送出，請查看 LINE",
    });
    expect(calls).toEqual(["config", "send:U123:text", "activity:success:已送出測試訂單通知"]);
  });

  it("records delivery failures with the existing vocabulary", async () => {
    const { port, calls } = fakePort({ reportTo: "U123" }, new Error("LINE unavailable"));
    await expect(runOrderTestNotification(port)).resolves.toEqual({
      kind: "error",
      message: "LINE unavailable",
    });
    expect(calls).toEqual(["config", "send:U123:flex", "activity:failed:測試訂單通知失敗：LINE unavailable"]);
  });
});
