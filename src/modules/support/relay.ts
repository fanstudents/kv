import { createHash } from "node:crypto";

export interface SupportRelayLineEvent {
  type: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

export type SupportRelayPayload =
  | { type: "parsed"; events: SupportRelayLineEvent[] }
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
  /** Stable request identity for a future idempotent legacy relay contract. */
  deliveryKey?: string;
}

export type SupportRelayForwardFailureKind =
  | "configuration"
  | "timeout"
  | "network"
  | "rejected"
  | "unknown";

export class SupportRelayForwardError extends Error {
  constructor(
    message: string,
    readonly kind: SupportRelayForwardFailureKind,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "SupportRelayForwardError";
  }
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

export interface SupportRelayIssue {
  operation: "forward" | "relay-audit" | "subscriber" | "activity" | "conversation";
  message: string;
  userId?: string;
}

export interface SupportRelayResult {
  capturedConversations: number;
  issues: SupportRelayIssue[];
  forward: {
    deliveryKey: string;
    status: "forwarded" | "not_confirmed";
    failureKind?: SupportRelayForwardFailureKind;
  };
}

/**
 * LINE can redeliver the same raw webhook body. The key identifies that
 * request without pretending that the legacy relay already supports replay.
 */
export function deriveSupportRelayDeliveryKey(rawBody: string): string {
  return `body:${createHash("sha256").update(rawBody, "utf8").digest("hex")}`;
}

export function parseSupportRelayPayload(rawBody: string): SupportRelayPayload {
  try {
    const decoded = JSON.parse(rawBody) as { events?: unknown };
    if (decoded.events === undefined) return { type: "parsed", events: [] };
    if (!Array.isArray(decoded.events)) return { type: "invalid" };

    return {
      type: "parsed",
      events: decoded.events.filter(isSupportRelayLineEvent),
    };
  } catch {
    return { type: "invalid" };
  }
}

function isSupportRelayLineEvent(value: unknown): value is SupportRelayLineEvent {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    activitySummary: `收到客戶 ${userId} 的訊息：「${text.slice(0, 60)}」（KV 只記錄、不回覆；轉送狀態另見活動紀錄）`,
  };
}

export async function processSupportRelay(params: {
  rawBody: string;
  signature: string;
  contentType: string;
  events: SupportRelayLineEvent[];
  ports: SupportRelayPorts;
}): Promise<SupportRelayResult> {
  const { rawBody, signature, contentType, events, ports } = params;
  const deliveryKey = deriveSupportRelayDeliveryKey(rawBody);

  const relayTask = async (): Promise<{
    issues: SupportRelayIssue[];
    outcome: SupportRelayResult["forward"];
  }> => {
    try {
      await ports.relay.forward({ rawBody, signature, contentType, deliveryKey });
      return {
        issues: [],
        outcome: { deliveryKey, status: "forwarded" },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "轉發失敗";
      const failureKind = error instanceof SupportRelayForwardError ? error.kind : "unknown";
      const issues: SupportRelayIssue[] = [{ operation: "forward", message }];
      try {
        await ports.repository.recordActivity({
          summary: `轉發給舊客服系統未確認成功：${message}（delivery key: ${deliveryKey}；未具備安全重播契約，本次不自動重送，請由舊系統 owner 依 key 確認）`,
          status: "failed",
        });
      } catch (auditError) {
        issues.push({ operation: "relay-audit", message: errorMessage(auditError) });
      }
      return {
        issues,
        outcome: { deliveryKey, status: "not_confirmed", failureKind },
      };
    }
  };

  const captureTasks = events.map(async (event): Promise<{
    capturedConversations: number;
    issues: SupportRelayIssue[];
  }> => {
      const capture = planSupportRelayCapture(event);
      if (capture.type === "skip") return { capturedConversations: 0, issues: [] };

      const issues: SupportRelayIssue[] = [];

      if (capture.sourceUserId) {
        try {
          await ports.subscribers.touch(capture.sourceUserId);
        } catch (error) {
          issues.push({ operation: "subscriber", message: errorMessage(error), userId: capture.userId });
        }
      }

      const [activity, conversation] = await Promise.allSettled([
        ports.repository.recordActivity({
          summary: capture.activitySummary,
          status: "success",
        }),
        ports.conversations.recordCustomerMessage(
          capture.userId,
          capture.text
        ),
      ]);
      if (activity.status === "rejected") {
        issues.push({ operation: "activity", message: errorMessage(activity.reason), userId: capture.userId });
      }
      if (conversation.status === "rejected") {
        issues.push({ operation: "conversation", message: errorMessage(conversation.reason), userId: capture.userId });
      }
      return {
        capturedConversations: conversation.status === "fulfilled" ? 1 : 0,
        issues,
      };
    });

  const [relay, ...captures] = await Promise.all([relayTask(), ...captureTasks]);
  return {
    capturedConversations: captures.reduce((total, capture) => total + capture.capturedConversations, 0),
    issues: [...relay.issues, ...captures.flatMap((capture) => capture.issues)],
    forward: relay.outcome,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "unknown failure");
}
