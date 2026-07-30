export interface SupportRelayLineEvent {
  type: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

export type SupportRelayPayload =
  | { type: "parsed"; events: unknown }
  | { type: "invalid" };

export type SupportRelayCapturePlan =
  | { type: "skip" }
  | {
      type: "capture";
      userId: string;
      sourceUserId: string | null;
      text: string;
      conversationRole: "customer";
      activitySummary: string;
    };

export function parseSupportRelayPayload(rawBody: string): SupportRelayPayload {
  try {
    const decoded = JSON.parse(rawBody) as { events?: unknown };
    return { type: "parsed", events: decoded.events ?? [] };
  } catch {
    return { type: "invalid" };
  }
}

export function planSupportRelayCapture(
  event: SupportRelayLineEvent
): SupportRelayCapturePlan {
  if (event.type !== "message" || event.message?.type !== "text") {
    return { type: "skip" };
  }

  const sourceUserId = event.source?.userId ?? null;
  const userId = sourceUserId ?? "未知使用者";
  const text = event.message.text ?? "";

  return {
    type: "capture",
    userId,
    sourceUserId,
    text,
    conversationRole: "customer",
    activitySummary: `收到客戶 ${userId} 的訊息：「${text.slice(0, 60)}」（已轉發給既有客服系統處理，這裡只記錄）`,
  };
}
