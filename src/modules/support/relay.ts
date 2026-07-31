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

export interface SupportRelayForwardRequest {
  rawBody: string;
  signature: string;
  contentType: string;
}

export interface SupportRelayActivity {
  summary: string;
  status: "success" | "failed";
}

export interface SupportRelayForwardPort {
  forward(request: SupportRelayForwardRequest): Promise<void>;
}

export interface SupportRelayRepositoryPort {
  recordActivity(activity: SupportRelayActivity): Promise<void>;
}

export interface SupportRelaySubscriberPort {
  touch(lineUserId: string): Promise<void>;
}

export interface SupportRelayConversationPort {
  recordCustomerMessage(lineUserId: string, text: string): Promise<void>;
}

export interface SupportRelayPorts {
  relay: SupportRelayForwardPort;
  repository: SupportRelayRepositoryPort;
  subscribers: SupportRelaySubscriberPort;
  conversations: SupportRelayConversationPort;
}

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

export async function processSupportRelay(params: {
  rawBody: string;
  signature: string;
  contentType: string;
  events: SupportRelayLineEvent[];
  ports: SupportRelayPorts;
}): Promise<void> {
  const { rawBody, signature, contentType, events, ports } = params;

  await Promise.allSettled([
    ports.relay
      .forward({ rawBody, signature, contentType })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : "轉發失敗";
        await ports.repository.recordActivity({
          summary: `轉發給舊客服系統失敗：${message}（客戶仍會由舊系統處理，只是這筆沒轉發成功）`,
          status: "failed",
        });
      }),
    ...events.map(async (event) => {
      const capture = planSupportRelayCapture(event);
      if (capture.type === "skip") return;

      if (capture.sourceUserId) {
        await ports.subscribers.touch(capture.sourceUserId).catch(() => {});
      }

      await Promise.allSettled([
        ports.repository.recordActivity({
          summary: capture.activitySummary,
          status: "success",
        }),
        ports.conversations.recordCustomerMessage(
          capture.userId,
          capture.text
        ),
      ]);
    }),
  ]);
}
