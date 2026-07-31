export interface LineInboundEvent {
  type?: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { id?: string; type?: string; text?: string };
  postback?: { data?: string };
}

export type VisitLineWebhookPayload =
  | { kind: "valid"; events: LineInboundEvent[] }
  | { kind: "invalid" };

export function parseVisitLineWebhookPayload(rawBody: string): VisitLineWebhookPayload {
  try {
    const parsed = JSON.parse(rawBody) as { events?: unknown } | null;
    if (!parsed || typeof parsed !== "object") return { kind: "invalid" };
    return { kind: "valid", events: (parsed.events ?? []) as LineInboundEvent[] };
  } catch {
    return { kind: "invalid" };
  }
}

export type VisitLinePostback =
  | { action: "confirm" }
  | { action: "cancel" }
  | { action: "tag"; contactId: string; value: string }
  | { action: "tag_done" }
  | { action: "unknown"; rawAction?: string };

export type VisitLineInbound =
  | {
      kind: "image";
      userId: string;
      replyToken: string;
      messageId: string;
    }
  | {
      kind: "text";
      userId: string;
      replyToken: string;
      text: string;
    }
  | {
      kind: "postback";
      userId: string;
      replyToken: string;
      postback: VisitLinePostback;
    }
  | {
      kind: "ignored";
      reason:
        | "missing-user"
        | "missing-reply-token"
        | "missing-message-id"
        | "unsupported-message"
        | "unsupported-event";
    };

export type VisitDecisionTextIntent =
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "other" };

export type VisitApprovalTextIntent =
  | { type: "send" }
  | { type: "cancel" }
  | { type: "revise"; instruction: string };

const CONFIRM_WORDS = ["要", "確認", "確定", "好的", "好", "沒問題", "ok", "yes"];
const CANCEL_WORDS = ["不要", "先不要", "算了", "不用", "取消", "cancel"];
const SEND_WORDS = ["寄出", "寄", "送出", "可以寄", "send"];

function includesAny(text: string, words: readonly string[]): boolean {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word.toLowerCase()));
}

export function classifyVisitDecisionText(text: string): VisitDecisionTextIntent {
  if (includesAny(text, CANCEL_WORDS)) return { type: "cancel" };
  if (includesAny(text, CONFIRM_WORDS)) return { type: "confirm" };
  return { type: "other" };
}

export function classifyVisitApprovalText(text: string): VisitApprovalTextIntent {
  if (includesAny(text, CANCEL_WORDS)) return { type: "cancel" };
  if (includesAny(text, SEND_WORDS)) return { type: "send" };
  return { type: "revise", instruction: text };
}

function parsePostback(data: string | undefined): VisitLinePostback {
  const params = new URLSearchParams(data ?? "");
  const action = params.get("action") ?? undefined;
  if (action === "confirm") return { action };
  if (action === "cancel") return { action };
  if (action === "tag_done") return { action };
  if (action === "tag") {
    const contactId = params.get("contact");
    const value = params.get("value");
    return contactId && value
      ? { action, contactId, value }
      : { action: "unknown", rawAction: action };
  }
  return { action: "unknown", rawAction: action };
}

export function normalizeVisitLineInbound(event: LineInboundEvent): VisitLineInbound {
  const userId = event.source?.userId;
  if (!userId) return { kind: "ignored", reason: "missing-user" };
  if (!event.replyToken) return { kind: "ignored", reason: "missing-reply-token" };

  if (event.type === "message") {
    if (event.message?.type === "image") {
      return event.message.id
        ? {
            kind: "image",
            userId,
            replyToken: event.replyToken,
            messageId: event.message.id,
          }
        : { kind: "ignored", reason: "missing-message-id" };
    }
    if (event.message?.type === "text") {
      return {
        kind: "text",
        userId,
        replyToken: event.replyToken,
        text: event.message.text ?? "",
      };
    }
    return { kind: "ignored", reason: "unsupported-message" };
  }

  if (event.type === "postback") {
    return {
      kind: "postback",
      userId,
      replyToken: event.replyToken,
      postback: parsePostback(event.postback?.data),
    };
  }

  return { kind: "ignored", reason: "unsupported-event" };
}

export interface VisitLineWebhookDispatchHandlers {
  touchSubscriber: (userId: string) => Promise<void>;
  handleImageMessage: (event: LineInboundEvent, userId: string) => Promise<void>;
  handleTextMessage: (event: LineInboundEvent, userId: string, baseUrl: string) => Promise<void>;
  handlePostback: (event: LineInboundEvent, userId: string, baseUrl: string) => Promise<void>;
}

export interface VisitLineWebhookDispatchInput {
  events: LineInboundEvent[];
  baseUrl: string;
  fallbackUserId: string;
  handlers: VisitLineWebhookDispatchHandlers;
}

/**
 * Owns inbound payload normalization and the workflow's failure-isolated
 * event fan-out. HTTP parsing and response mapping remain in the route.
 */
export async function dispatchVisitLineWebhookEvents({
  events,
  baseUrl,
  fallbackUserId,
  handlers,
}: VisitLineWebhookDispatchInput): Promise<void> {
  await Promise.allSettled(
    events.map(async (event) => {
      if (!event.replyToken) return;

      const userId = event.source?.userId ?? fallbackUserId;
      if (event.source?.userId) await handlers.touchSubscriber(event.source.userId).catch(() => {});

      const inbound = normalizeVisitLineInbound({
        ...event,
        source: { ...event.source, userId },
      });

      if (inbound.kind === "image") {
        await handlers.handleImageMessage(event, userId);
      } else if (inbound.kind === "text") {
        await handlers.handleTextMessage(event, userId, baseUrl);
      } else if (inbound.kind === "postback") {
        await handlers.handlePostback(event, userId, baseUrl);
      }
    })
  );
}
