import { formatOrderText, type OrderPushStyle } from "./notification";
import type { NormalizedOrder } from "./domain";
import type { OrdersAgentConfig } from "./ports";

export interface OrderTestNotificationDelivery {
  recipient: string;
  style: OrderPushStyle;
  text: string;
  title: "新訂單通知（測試）";
  accentColor: "#F59E0B";
}

export type OrderTestNotificationPlan =
  | { kind: "missing-recipient"; message: string }
  | { kind: "ready"; delivery: OrderTestNotificationDelivery };

export const DEMO_ORDER: NormalizedOrder = {
  id: "demo",
  tradeNo: "DEN26071757D27ECED16",
  amount: 2180,
  currency: "TWD",
  userName: "黃晴",
  userEmail: "sonia8265@gmail.com",
  itemNames: ["Claude 實戰工作坊課程 - 7/19(日) 13:00~17:00 台中席次"],
  couponCode: null,
  isRefund: false,
  paidAt: null,
};

const ORDER_PUSH_STYLES: OrderPushStyle[] = ["text", "flex", "confirm", "buttons"];

export function planOrderTestNotification(agentConfig: OrdersAgentConfig | null): OrderTestNotificationPlan {
  const settings = (agentConfig?.settings ?? {}) as Record<string, unknown>;
  const recipient = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const style = ORDER_PUSH_STYLES.includes(settings.pushStyle as OrderPushStyle)
    ? (settings.pushStyle as OrderPushStyle)
    : "flex";

  if (!recipient) {
    return {
      kind: "missing-recipient",
      message: "尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定",
    };
  }

  return {
    kind: "ready",
    delivery: {
      recipient,
      style,
      text: formatOrderText(DEMO_ORDER),
      title: "新訂單通知（測試）",
      accentColor: "#F59E0B",
    },
  };
}
