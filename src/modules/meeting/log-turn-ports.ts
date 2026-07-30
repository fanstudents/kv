import type { MeetingTurnLogRequest } from "./log-turn-rules";

export interface MeetingTurnLogPort {
  append(input: MeetingTurnLogRequest): Promise<void>;
}
