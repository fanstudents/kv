import type { NormalizedOrder } from "@/modules/orders/domain";

export type OrderPushStyle = "text" | "flex" | "confirm" | "buttons";

export type OrderNotificationPlan =
  | { type: "disabled" }
  | { type: "missing_recipient"; activitySummary: string }
  | {
      type: "deliver";
      recipient: string;
      style: OrderPushStyle;
      text: string;
      title: string;
      accentColor: "#F59E0B";
      successSummary: string;
    };

export function formatOrderText(order: NormalizedOrder): string {
  const itemLine = order.itemNames.join("、");
  const hasPaymentDetail = Boolean(order.tradeNo);
  const amountLine = hasPaymentDetail
    ? `金額：${order.currency} ${order.amount}${order.couponCode ? `（優惠碼：${order.couponCode}）` : ""}\n單號：${order.tradeNo}`
    : "（此通知來自選課紀錄，Teachify 未提供金額與單號明細）";

  if (order.isRefund) {
    return `💸 訂單退款\n\n${order.userName}（${order.userEmail}）\n品項：${itemLine}\n${amountLine}`;
  }
  return `🎉 新訂單成立！\n\n${order.userName}（${order.userEmail}）\n品項：${itemLine}\n${amountLine}`;
}

export function planOrderNotification(
  order: NormalizedOrder,
  agentRow: { enabled?: boolean | null; settings?: unknown } | null
): OrderNotificationPlan {
  if (agentRow?.enabled === false) return { type: "disabled" };

  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const style = isOrderPushStyle(settings.pushStyle) ? settings.pushStyle : "flex";

  if (!reportTo) {
    return {
      type: "missing_recipient",
      activitySummary: `收到新訂單（${order.tradeNo}）但尚未設定通知對象，請到訂單 Agent 設定頁補上`,
    };
  }

  return {
    type: "deliver",
    recipient: reportTo,
    style,
    text: formatOrderText(order),
    title: order.isRefund ? "訂單退款通知" : "新訂單通知",
    accentColor: "#F59E0B",
    successSummary: `${order.isRefund ? "退款" : "新訂單"}通知已送出：${order.userName} / ${order.itemNames.join("、")} / ${order.currency} ${order.amount}`,
  };
}

function isOrderPushStyle(value: unknown): value is OrderPushStyle {
  return value === "text" || value === "flex" || value === "confirm" || value === "buttons";
}
