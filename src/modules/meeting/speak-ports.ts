import type { MeetingSpeakRequest } from "./speak-rules";

export interface MeetingSpeakPort {
  synthesize(input: MeetingSpeakRequest): Promise<ArrayBuffer>;
}
