import type { MeetingTurnLogPort } from "./log-turn-ports";
import type { MeetingTurnLogRequest } from "./log-turn-rules";

export type MeetingTurnLogResult =
  | { kind: "invalid"; message: "缺少 meetingId 或 content" }
  | { kind: "ok" };

export async function runMeetingTurnLog(
  input: MeetingTurnLogRequest,
  port: MeetingTurnLogPort
): Promise<MeetingTurnLogResult> {
  if (!input.meetingId || !input.content) {
    return { kind: "invalid", message: "缺少 meetingId 或 content" };
  }

  try {
    await port.append(input);
  } catch {
    // 紀錄寫入失敗不影響會議進行
  }
  return { kind: "ok" };
}
