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
