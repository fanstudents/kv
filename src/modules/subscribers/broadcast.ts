export type BroadcastChannel = "all" | "primary" | "support";
export type BroadcastStyle = "text" | "flex" | "confirm" | "buttons";

export interface SubscribersBroadcastRequest {
  tags: string[];
  channel: BroadcastChannel;
  text: string;
  style: BroadcastStyle;
  title: string;
  accentColor: string;
}

export type SubscribersBroadcastParseResult =
  | { kind: "invalid"; message: string }
  | { kind: "ok"; input: SubscribersBroadcastRequest };

export interface BroadcastRecipient {
  id: string;
  line_user_id: string;
  channel: Exclude<BroadcastChannel, "all">;
}

export interface BroadcastLogRecord {
  tag_filter: string | null;
  channel_filter: Exclude<BroadcastChannel, "all"> | null;
  message_style: BroadcastStyle;
  message_text: string;
  recipient_count: number;
  success_count: number;
  failed_count: number;
}

export interface SubscribersBroadcastPort {
  listLogs(): Promise<{ data: unknown; error: { message: string } | null }>;
  listRecipients(request: SubscribersBroadcastRequest): Promise<{
    data: BroadcastRecipient[] | null;
    error: { message: string } | null;
  }>;
  send(recipient: BroadcastRecipient, request: SubscribersBroadcastRequest): Promise<void>;
  recordLog(log: BroadcastLogRecord): Promise<void>;
}

const BROADCAST_STYLES: BroadcastStyle[] = ["text", "flex", "confirm", "buttons"];

export function parseSubscribersBroadcastRequest(body: unknown): SubscribersBroadcastParseResult {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const tags = Array.isArray(input.tags) ? input.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const channel: BroadcastChannel = input.channel === "primary" || input.channel === "support" ? input.channel : "all";
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const style: BroadcastStyle = BROADCAST_STYLES.includes(input.style as BroadcastStyle)
    ? (input.style as BroadcastStyle)
    : "text";
  const title = typeof input.title === "string" && input.title ? input.title : "團隊公告";
  const accentColor =
    typeof input.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(input.accentColor)
      ? input.accentColor
      : "#06C755";

  if (!text) return { kind: "invalid", message: "缺少要推播的訊息內容" };

  return {
    kind: "ok",
    input: { tags, channel, text, style, title, accentColor },
  };
}

export async function runSubscribersBroadcastRead(port: SubscribersBroadcastPort) {
  const { data, error } = await port.listLogs();
  if (error) return { kind: "error" as const, message: error.message };
  return { kind: "ok" as const, data };
}

export async function runSubscribersBroadcast(
  input: SubscribersBroadcastParseResult,
  port: SubscribersBroadcastPort,
) {
  if (input.kind === "invalid") return { kind: "error" as const, message: input.message };

  const { data: recipients, error } = await port.listRecipients(input.input);
  if (error) return { kind: "error" as const, message: error.message };
  if (!recipients || recipients.length === 0) {
    return { kind: "error" as const, message: "沒有符合條件的訂閱者" };
  }

  const results = await Promise.allSettled(recipients.map((recipient) => port.send(recipient, input.input)));
  const successCount = results.filter((result) => result.status === "fulfilled").length;
  const failedCount = results.length - successCount;

  await port.recordLog({
    tag_filter: input.input.tags.length > 0 ? input.input.tags.join(",") : null,
    channel_filter: input.input.channel === "all" ? null : input.input.channel,
    message_style: input.input.style,
    message_text: input.input.text,
    recipient_count: recipients.length,
    success_count: successCount,
    failed_count: failedCount,
  });

  return {
    kind: "ok" as const,
    data: { ok: true, recipientCount: recipients.length, successCount, failedCount },
  };
}
