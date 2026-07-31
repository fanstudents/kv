import type { OrdersTestNotificationPort } from "./test-notification-ports";
import { planOrderTestNotification } from "./test-notification-rules";

export type OrderTestNotificationResult =
  | { kind: "missing-recipient"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export async function runOrderTestNotification(
  port: OrdersTestNotificationPort,
): Promise<OrderTestNotificationResult> {
  const plan = planOrderTestNotification(await port.getAgentConfig());
  if (plan.kind === "missing-recipient") return plan;

  try {
    await port.send(plan.delivery);
    await port.recordActivity({
      summary: "已送出測試訂單通知",
      status: "success",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
    await port.recordActivity({
      summary: `測試訂單通知失敗：${message}`,
      status: "failed",
    });
    return { kind: "error", message };
  }

  return { kind: "success", message: "測試通知已送出，請查看 LINE" };
}
