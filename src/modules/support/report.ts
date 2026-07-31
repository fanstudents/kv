export type SupportReportPushStyle = "text" | "flex" | "confirm" | "buttons";

export interface SupportConversation {
  line_user_id: string;
  text: string;
  occurred_at: string;
}

export interface SupportReportAgentConfig {
  enabled?: boolean | null;
  settings?: unknown;
}

export interface SupportReportActivity {
  summary: string;
  status: "success" | "failed";
}

export interface SupportReportRepository {
  getAgentConfig(): Promise<SupportReportAgentConfig | null>;
  listCustomerMessages(cutoff: string): Promise<SupportConversation[]>;
  getDisplayNames(lineUserIds: string[]): Promise<ReadonlyMap<string, string | null>>;
  recordActivity(activity: SupportReportActivity): Promise<void>;
}

export interface SupportReportSummaryProvider {
  summarize(rawBrief: string): Promise<string | null>;
}

export interface SupportReportDelivery {
  deliver(notification: {
    recipient: string;
    style: SupportReportPushStyle;
    text: string;
    title: string;
    accentColor: string;
  }): Promise<void>;
}

export interface SupportReportDependencies {
  repository: SupportReportRepository;
  summary: SupportReportSummaryProvider;
  delivery: SupportReportDelivery;
}

export interface SupportReportClock {
  nowMs(): number;
  nowDate(): Date;
}

export interface PreparedSupportReport {
  customerCount: number;
  messageCount: number;
  dateLabel: string;
  rawBrief: string | null;
  fallbackText: string;
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

export const SUPPORT_REPORT_SUMMARY_CONFIG = {
  operation: "客服每日彙報摘要",
  agentSlug: "support",
  systemPrompt:
    "你是客服接待專員安柏，每天早上向老闆彙整昨天客服官方帳號收到的所有客戶留言。請用繁體中文，" +
    "以貼心、俐落的口吻，先一句總結昨天客戶進線的整體狀況（幾位客戶、大致在問什麼），" +
    "再依客戶條列（每位客戶一行，用顯示名稱開頭），簡短講他問了什麼、有沒有情緒明顯不佳或需要優先回應的跡象。" +
    "看起來需要老闆親自留意或跟進的（客訴、負面情緒、重複追問沒人回）放在最後單獨標註。" +
    "全文控制在 400 字內，不要用 markdown 符號，條列用「•」開頭。",
} as const;

export function planSupportReportDelivery(
  agentRow: SupportReportAgentConfig | null
): SupportReportDeliveryPlan {
  if (agentRow?.enabled === false) {
    return { type: "disabled", message: "客服 Agent 已停用，略過匯報" };
  }

  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const style = isSupportReportPushStyle(settings.pushStyle) ? settings.pushStyle : "flex";

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
    const label = displayNames.get(userId) || `未命名客戶（${userId.slice(0, 10)}…）`;
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

export async function runSupportReport(params: {
  dependencies: SupportReportDependencies;
  clock: SupportReportClock;
}): Promise<{ ok: boolean; message: string }> {
  const { dependencies, clock } = params;
  const agentRow = await dependencies.repository.getAgentConfig();
  const deliveryPlan = planSupportReportDelivery(agentRow);

  if (deliveryPlan.type !== "deliver") {
    return { ok: false, message: deliveryPlan.message };
  }

  const messages = await dependencies.repository.listCustomerMessages(supportReportCutoff(clock.nowMs()));
  const displayNames =
    messages.length > 0
      ? await dependencies.repository.getDisplayNames(supportCustomerIds(messages))
      : new Map<string, string | null>();
  const prepared = prepareSupportReport(messages, displayNames, clock.nowDate());
  const aiSummary = prepared.rawBrief ? await dependencies.summary.summarize(prepared.rawBrief) : null;
  const reportText = finalizeSupportReport(prepared, aiSummary);

  try {
    await dependencies.delivery.deliver({ ...deliveryPlan, text: reportText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播失敗";
    await dependencies.repository.recordActivity({
      summary: `每日客服彙報推播失敗：${message}`,
      status: "failed",
    });
    return { ok: false, message };
  }

  await dependencies.repository.recordActivity({
    summary: `已向老闆送出每日客服彙報（${prepared.customerCount} 位客戶、${prepared.messageCount} 則留言）`,
    status: "success",
  });

  return {
    ok: true,
    message: `客服彙報已送出（${prepared.customerCount} 位客戶、${prepared.messageCount} 則留言）`,
  };
}

function isSupportReportPushStyle(value: unknown): value is SupportReportPushStyle {
  return value === "text" || value === "flex" || value === "confirm" || value === "buttons";
}
