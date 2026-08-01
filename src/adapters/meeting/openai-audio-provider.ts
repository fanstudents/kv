import "server-only";

import { createSpeech, createTranscription } from "@/adapters/openai/client";
import type { MeetingAudioProvider } from "@/modules/meeting/audio";

const TTS1_VOICE_FALLBACK: Record<string, string> = {
  coral: "nova",
  sage: "shimmer",
  ash: "onyx",
  ballad: "echo",
  verse: "echo",
};

async function transcribeAudio(file: Blob, promptHint?: string): Promise<string> {
  try {
    return await createTranscription({ file, promptHint, model: "gpt-4o-transcribe" });
  } catch {
    return createTranscription({ file, promptHint, model: "whisper-1" });
  }
}

async function synthesizeSpeech(params: {
  text: string;
  voice: string;
  instructions?: string;
  speed?: number;
}): Promise<ArrayBuffer> {
  try {
    return await createSpeech({
      model: "gpt-4o-mini-tts",
      voice: params.voice,
      input: params.text,
      ...(params.instructions ? { instructions: params.instructions } : {}),
    });
  } catch {
    return createSpeech({
      model: "tts-1",
      voice: TTS1_VOICE_FALLBACK[params.voice] ?? params.voice,
      input: params.text,
      ...(params.speed ? { speed: params.speed } : {}),
    });
  }
}

export function createOpenAiMeetingAudioProvider(): MeetingAudioProvider {
  return {
    synthesize(input) {
      return synthesizeSpeech(input);
    },
    transcribe(input) {
      return transcribeAudio(input.audio as Blob, input.promptHint);
    },
  };
}
