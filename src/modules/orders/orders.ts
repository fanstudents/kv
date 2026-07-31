export interface NormalizedOrder {
  id: string;
  tradeNo: string;
  amount: number;
  currency: string;
  userName: string;
  userEmail: string;
  itemNames: string[];
  couponCode: string | null;
  isRefund: boolean;
  paidAt: string | null;
}

export type OrderPushStyle = "text" | "flex" | "confirm" | "buttons";

export interface OrdersAgentConfig {
  enabled?: boolean | null;
  settings?: unknown;
}

export interface OrdersActivity {
  summary: string;
  status: "success" | "failed";
}

export interface OrderMessageDelivery {
  recipient: string;
  style: OrderPushStyle;
  text: string;
  title: string;
  accentColor: "#F59E0B";
}

export interface OrdersRepository {
  upsertOrder(order: NormalizedOrder): Promise<void>;
  getAgentConfig(): Promise<OrdersAgentConfig | null>;
  recordActivity(activity: OrdersActivity): Promise<void>;
}

export interface OrdersDelivery {
  deliver(delivery: OrderMessageDelivery): Promise<void>;
}

export interface OrdersDependencies {
  repository: OrdersRepository;
  delivery: OrdersDelivery;
}

export type OrderNotificationPlan =
  | { type: "disabled" }
  | { type: "missing_recipient"; activitySummary: string }
  | (OrderMessageDelivery & { type: "deliver"; successSummary: string });

export type ProcessOrderPayloadResult =
  | { type: "unrecognized" }
  | { type: "disabled" }
  | { type: "missing_recipient" }
  | { type: "delivered" }
  | { type: "delivery_failed"; message: string };

export type OrderTestNotificationPlan =
  | { kind: "missing-recipient"; message: string }
  | { kind: "ready"; delivery: OrderMessageDelivery & { title: "新訂單通知（測試）" } };

export type OrderTestNotificationResult =
  | { kind: "missing-recipient"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

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

export function parseOrderPayload(body: unknown): NormalizedOrder | null {
  if (!body || typeof body !== "object") return null;
  const envelope = body as Record<string, unknown>;

  let candidate: Record<string, unknown> | null = null;
  if (isOrderLike(envelope)) candidate = envelope;
  else if (isOrderLike(envelope.order)) candidate = envelope.order as Record<string, unknown>;
  else if (isOrderLike(envelope.data)) candidate = envelope.data as Record<string, unknown>;

  if (candidate) return normalizeOrderCandidate(candidate);
  return parseEnrollmentPayload(envelope);
}

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
  agentRow: OrdersAgentConfig | null
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

export async function processOrderPayload(params: {
  payload: unknown;
  rawBody: string;
  dependencies: OrdersDependencies;
}): Promise<ProcessOrderPayloadResult> {
  const { payload, rawBody, dependencies } = params;
  const order = parseOrderPayload(payload);

  if (!order) {
    await dependencies.repository.recordActivity({
      summary: `收到 Teachify Webhook 但無法解析訂單欄位，原始內容：${rawBody.slice(0, 500)}`,
      status: "failed",
    });
    return { type: "unrecognized" };
  }

  await dependencies.repository.upsertOrder(order);
  const agentRow = await dependencies.repository.getAgentConfig();
  const notification = planOrderNotification(order, agentRow);

  if (notification.type === "disabled") return { type: "disabled" };

  if (notification.type === "missing_recipient") {
    await dependencies.repository.recordActivity({
      summary: notification.activitySummary,
      status: "failed",
    });
    return { type: "missing_recipient" };
  }

  try {
    await dependencies.delivery.deliver(notification);
    await dependencies.repository.recordActivity({
      summary: notification.successSummary,
      status: "success",
    });
    return { type: "delivered" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
    await dependencies.repository.recordActivity({
      summary: `訂單通知推播失敗：${message}`,
      status: "failed",
    });
    return { type: "delivery_failed", message };
  }
}

export function planOrderTestNotification(
  agentConfig: OrdersAgentConfig | null
): OrderTestNotificationPlan {
  const settings = (agentConfig?.settings ?? {}) as Record<string, unknown>;
  const recipient = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const style = isOrderPushStyle(settings.pushStyle) ? settings.pushStyle : "flex";

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

export async function runOrderTestNotification(
  dependencies: Pick<OrdersDependencies, "repository" | "delivery">
): Promise<OrderTestNotificationResult> {
  const plan = planOrderTestNotification(await dependencies.repository.getAgentConfig());
  if (plan.kind === "missing-recipient") return plan;

  try {
    await dependencies.delivery.deliver(plan.delivery);
    await dependencies.repository.recordActivity({
      summary: "已送出測試訂單通知",
      status: "success",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
    await dependencies.repository.recordActivity({
      summary: `測試訂單通知失敗：${message}`,
      status: "failed",
    });
    return { kind: "error", message };
  }

  return { kind: "success", message: "測試通知已送出，請查看 LINE" };
}

function isOrderPushStyle(value: unknown): value is OrderPushStyle {
  return value === "text" || value === "flex" || value === "confirm" || value === "buttons";
}

function isOrderLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return "id" in order && ("amount" in order || "trade_no" in order || "items" in order);
}

function normalizeOrderCandidate(candidate: Record<string, unknown>): NormalizedOrder {
  const items = Array.isArray(candidate.items)
    ? (candidate.items as Record<string, unknown>[])
    : [];
  const itemNames = items
    .map((item) => (typeof item.name === "string" ? item.name : null))
    .filter((name): name is string => Boolean(name));

  return {
    id: String(candidate.id ?? ""),
    tradeNo: String(candidate.trade_no ?? candidate.tradeNo ?? ""),
    amount: Number(candidate.amount ?? 0),
    currency: String(candidate.currency ?? "TWD"),
    userName: String(candidate.user_name ?? candidate.userName ?? "（未提供姓名）"),
    userEmail: String(candidate.user_email ?? candidate.userEmail ?? ""),
    itemNames: itemNames.length > 0 ? itemNames : ["（未提供品項名稱）"],
    couponCode: typeof candidate.coupon_code === "string" ? candidate.coupon_code : null,
    isRefund: Boolean(candidate.refund) || candidate.status === "refunded",
    paidAt: typeof candidate.paid_at === "string" ? candidate.paid_at : null,
  };
}

function parseEnrollmentPayload(envelope: Record<string, unknown>): NormalizedOrder | null {
  if (envelope.type !== "course.student_enroll") return null;
  if (!envelope.data || typeof envelope.data !== "object") return null;

  const data = envelope.data as Record<string, unknown>;
  const course =
    data.course && typeof data.course === "object"
      ? (data.course as Record<string, unknown>)
      : {};
  const user =
    data.user && typeof data.user === "object" ? (data.user as Record<string, unknown>) : {};
  if (typeof course.name !== "string" || typeof user.name !== "string") return null;

  return {
    id: String(data.id ?? ""),
    tradeNo: "",
    amount: 0,
    currency: "TWD",
    userName: user.name,
    userEmail: typeof user.email === "string" ? user.email : "",
    itemNames: [course.name],
    couponCode: null,
    isRefund: false,
    paidAt: typeof data.created_at === "string" ? data.created_at : null,
  };
}
