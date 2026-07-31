import type { SubscribersBroadcastPort } from "./broadcast-ports";
import type { SubscribersBroadcastParseResult } from "./broadcast-rules";

export type SubscribersBroadcastResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; data: unknown };

export async function runSubscribersBroadcastRead(port: SubscribersBroadcastPort): Promise<SubscribersBroadcastResult> {
  const { data, error } = await port.listLogs();
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", data };
}

export async function runSubscribersBroadcast(
  input: SubscribersBroadcastParseResult,
  port: SubscribersBroadcastPort,
): Promise<SubscribersBroadcastResult> {
  if (input.kind === "invalid") return { kind: "error", message: input.message };

  const { data: recipients, error } = await port.listRecipients(input.input);
  if (error) return { kind: "error", message: error.message };
  if (!recipients || recipients.length === 0) return { kind: "error", message: "沒有符合條件的訂閱者" };

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
    kind: "ok",
    data: { ok: true, recipientCount: recipients.length, successCount, failedCount },
  };
}
