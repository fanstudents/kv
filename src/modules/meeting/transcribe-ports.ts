import type { MeetingTranscribeAudio } from "./transcribe-rules";

export interface MeetingTranscribeInput {
  audio: MeetingTranscribeAudio;
  promptHint?: string;
}

export interface MeetingTranscribePort {
  transcribe(input: MeetingTranscribeInput): Promise<string>;
}
