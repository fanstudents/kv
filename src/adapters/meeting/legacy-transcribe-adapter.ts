import "server-only";
import { transcribeAudio } from "@/lib/openai";
import type { MeetingTranscribePort } from "@/modules/meeting/transcribe-ports";

export function createLegacyMeetingTranscribeAdapter(): MeetingTranscribePort {
  return {
    transcribe(input) {
      return transcribeAudio({ file: input.audio as Blob, promptHint: input.promptHint });
    },
  };
}
