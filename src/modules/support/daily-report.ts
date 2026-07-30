export type SupportReportPushStyle = "text" | "flex" | "confirm" | "buttons";

export interface SupportConversation {
  line_user_id: string;
  text: string;
  occurred_at: string;
}

export type SupportReportDeliveryPlan =
  | { type: "disabled"; message: "客服 Agent 已停用，略過匯報" }
  | { type: "missing_recipient"; message: "尚未設定匯報對象（reportTo）" }
  | {
      type: "deliver";
      recipient: string;
      style: SupportReportPushStyle;
      title: "客服 Agent・每日彙報";
      accentColor: "#EC4899";
    };

export interface PreparedSupportReport {
  customerCount: number;
  messageCount: number;
  dateLabel: string;
  rawBrief: string | null;
  fallbackText: string;
}

export function planSupportReportDelivery(
  agentRow: { enabled?: boolean | null; settings?: unknown } | null
): SupportReportDeliveryPlan {
  if (agentRow?.enabled === false) {
    return { type: "disabled", message: "客服 Agent 已停用，略過匯報" };
  }

  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const style = isSupportReportPushStyle(settings.pushStyle)
    ? settings.pushStyle
    : "flex";

  if (!reportTo) {
    return { type: "missing_recipient", message: "尚未設定匯報對象（reportTo）" };
  }

  return {
    type: "deliver",
    recipient: reportTo,
    style,
    title: "客服 Agent・每日彙報",
    accentColor: "#EC4899",
  };
}

export function supportReportCutoff(nowMs: number): string {
  return new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
}

export function supportCustomerIds(messages: SupportConversation[]): string[] {
  return [...new Set(messages.map((message) => message.line_user_id))];
}

export function prepareSupportReport(
  messages: SupportConversation[],
  displayNames: ReadonlyMap<string, string | null>,
  now: Date
): PreparedSupportReport {
  const dateLabel = now.toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  if (messages.length === 0) {
    return {
      customerCount: 0,
      messageCount: 0,
      dateLabel,
      rawBrief: null,
      fallbackText: `${dateLabel} 客服彙報\n\n過去 24 小時客服官方帳號沒有收到新的客戶留言。`,
    };
  }

  const uniqueIds = supportCustomerIds(messages);
  const byCustomer = new Map<string, SupportConversation[]>();
  for (const message of messages) {
    const list = byCustomer.get(message.line_user_id) ?? [];
    list.push(message);
    byCustomer.set(message.line_user_id, list);
  }

  const lines = [`統計：${uniqueIds.length} 位客戶、共 ${messages.length} 則留言`];
  for (const [userId, list] of byCustomer) {
    const label =
      displayNames.get(userId) || `未命名客戶（${userId.slice(0, 10)}…）`;
    lines.push(`\n${label}（${list.length} 則）：`);
    for (const message of list.slice(0, 8)) {
      lines.push(`- ${message.text.slice(0, 120)}`);
    }
  }

  const rawBrief = lines.join("\n");
  return {
    customerCount: uniqueIds.length,
    messageCount: messages.length,
    dateLabel,
    rawBrief,
    fallbackText: `${dateLabel} 客服彙報\n\n${rawBrief}`,
  };
}

export function finalizeSupportReport(
  prepared: PreparedSupportReport,
  aiSummary: string | null
): string {
  if (prepared.rawBrief === null) return prepared.fallbackText;
  return `${prepared.dateLabel} 客服彙報\n\n${aiSummary ?? prepared.rawBrief}`;
}

function isSupportReportPushStyle(
  value: unknown
): value is SupportReportPushStyle {
  return value === "text" || value === "flex" || value === "confirm" || value === "buttons";
}
