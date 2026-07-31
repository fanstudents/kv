import type { BroadcastChannel, BroadcastStyle, SubscribersBroadcastRequest } from "./broadcast-rules";

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
