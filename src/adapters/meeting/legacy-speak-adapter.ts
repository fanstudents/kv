import "server-only";
import { synthesizeSpeech } from "@/lib/openai";
import type { MeetingSpeakPort } from "@/modules/meeting/speak-ports";

export function createLegacyMeetingSpeakAdapter(): MeetingSpeakPort {
  return {
    synthesize(input) {
      return synthesizeSpeech(input);
    },
  };
}
