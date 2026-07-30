import type { MeetingRealtimeUsageLogPort } from "./log-usage-ports";
import type { MeetingRealtimeUsageLogRequest } from "./log-usage-rules";

export type MeetingRealtimeUsageLogResult =
  | { kind: "invalid"; message: "缺少 model" }
  | { kind: "ok" };

export async function runMeetingRealtimeUsageLog(
  input: MeetingRealtimeUsageLogRequest,
  port: MeetingRealtimeUsageLogPort
): Promise<MeetingRealtimeUsageLogResult> {
  if (!input.model) return { kind: "invalid", message: "缺少 model" };

  // 保留現有 route 邊界：provider port 若真的拋錯，讓呼叫端維持原本
  // 未攔截的錯誤行為；legacy logRealtimeUsage 自己會吞掉寫入失敗。
  await port.record(input);
  return { kind: "ok" };
}
