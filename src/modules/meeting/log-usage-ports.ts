import type { MeetingRealtimeUsageLogRequest } from "./log-usage-rules";

export interface MeetingRealtimeUsageLogPort {
  record(input: MeetingRealtimeUsageLogRequest): Promise<void>;
}
