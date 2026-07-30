import { parseOrderPayload } from "@/modules/orders/inbound";
import { planOrderNotification } from "@/modules/orders/notification";
import type { OrdersPorts } from "@/modules/orders/ports";

export type ProcessOrderPayloadResult =
  | { type: "unrecognized" }
  | { type: "disabled" }
  | { type: "missing_recipient" }
  | { type: "delivered" }
  | { type: "delivery_failed"; message: string };

export async function processOrderPayload(params: {
  payload: unknown;
  rawBody: string;
  ports: OrdersPorts;
}): Promise<ProcessOrderPayloadResult> {
  const { payload, rawBody, ports } = params;
  const order = parseOrderPayload(payload);

  if (!order) {
    await ports.repository.recordActivity({
      summary: `收到 Teachify Webhook 但無法解析訂單欄位，原始內容：${rawBody.slice(0, 500)}`,
      status: "failed",
    });
    return { type: "unrecognized" };
  }

  await ports.repository.upsertOrder(order);
  const agentRow = await ports.repository.getAgentConfig();
  const notification = planOrderNotification(order, agentRow);

  if (notification.type === "disabled") return { type: "disabled" };

  if (notification.type === "missing_recipient") {
    await ports.repository.recordActivity({
      summary: notification.activitySummary,
      status: "failed",
    });
    return { type: "missing_recipient" };
  }

  try {
    await ports.delivery.deliver(notification);
    await ports.repository.recordActivity({
      summary: notification.successSummary,
      status: "success",
    });
    return { type: "delivered" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
    await ports.repository.recordActivity({
      summary: `訂單通知推播失敗：${message}`,
      status: "failed",
    });
    return { type: "delivery_failed", message };
  }
}
