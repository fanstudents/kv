import "server-only";

import { synthesizeSpeech, transcribeAudio } from "@/lib/openai";
import type { MeetingAudioProvider } from "@/modules/meeting/audio";

export function createOpenAiMeetingAudioProvider(): MeetingAudioProvider {
  return {
    synthesize(input) {
      return synthesizeSpeech(input);
    },
    transcribe(input) {
      return transcribeAudio({ file: input.audio as Blob, promptHint: input.promptHint });
    },
  };
}
