import { DEFAULT_SPEAK_INSTRUCTIONS, DEFAULT_SPEAK_SPEED } from "./audio-defaults";

export { DEFAULT_SPEAK_INSTRUCTIONS, DEFAULT_SPEAK_SPEED } from "./audio-defaults";

export interface MeetingSpeakRequest {
  text: string;
  voice: string;
  instructions: string;
  speed: number;
}

export interface MeetingTranscribeAudio {
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface MeetingTranscribeRequest {
  audio?: MeetingTranscribeAudio;
  promptHint?: string;
}

export interface MeetingTranscribeInput {
  audio: MeetingTranscribeAudio;
  promptHint?: string;
}

export interface MeetingFormLike {
  get(name: string): unknown;
}

export interface MeetingAudioProvider {
  synthesize(input: MeetingSpeakRequest): Promise<ArrayBuffer>;
  transcribe(input: MeetingTranscribeInput): Promise<string>;
}

export type MeetingSpeakResult =
  | { kind: "invalid"; message: "\u7f3a\u5c11\u6587\u5b57\u5167\u5bb9" }
  | { kind: "provider-failed"; message: string }
  | { kind: "ok"; audio: ArrayBuffer };

export type MeetingTranscribeResult =
  | { kind: "invalid"; message: "\u7f3a\u5c11\u97f3\u8a0a\u6a94\u6848" }
  | { kind: "provider-failed"; message: string }
  | { kind: "ok"; text: string };

export function parseMeetingSpeakRequest(payload: unknown): MeetingSpeakRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    text: typeof body.text === "string" ? body.text.trim() : "",
    voice: typeof body.voice === "string" ? body.voice : "alloy",
    instructions:
      typeof body.instructions === "string" ? body.instructions : DEFAULT_SPEAK_INSTRUCTIONS,
    speed: typeof body.speed === "number" ? body.speed : DEFAULT_SPEAK_SPEED,
  };
}

export function parseMeetingTranscribeForm(form: MeetingFormLike): MeetingTranscribeRequest {
  const audio = form.get("audio");
  const promptHintValue = form.get("promptHint");
  return {
    audio:
      audio && typeof audio === "object" && "arrayBuffer" in audio
        ? (audio as MeetingTranscribeAudio)
        : undefined,
    promptHint: promptHintValue ? String(promptHintValue) : undefined,
  };
}

export async function speakMeeting(
  input: MeetingSpeakRequest,
  provider: Pick<MeetingAudioProvider, "synthesize">
): Promise<MeetingSpeakResult> {
  if (!input.text) return { kind: "invalid", message: "\u7f3a\u5c11\u6587\u5b57\u5167\u5bb9" };

  try {
    const audio = await provider.synthesize(input);
    return { kind: "ok", audio };
  } catch (error) {
    return {
      kind: "provider-failed",
      message: error instanceof Error ? error.message : "\u8a9e\u97f3\u5408\u6210\u5931\u6557",
    };
  }
}

export async function transcribeMeeting(
  input: MeetingTranscribeRequest,
  provider: Pick<MeetingAudioProvider, "transcribe">
): Promise<MeetingTranscribeResult> {
  if (!input.audio) return { kind: "invalid", message: "\u7f3a\u5c11\u97f3\u8a0a\u6a94\u6848" };

  try {
    const text = await provider.transcribe({ audio: input.audio, promptHint: input.promptHint });
    return { kind: "ok", text };
  } catch (error) {
    return {
      kind: "provider-failed",
      message: error instanceof Error ? error.message : "\u8a9e\u97f3\u8fa8\u8b58\u5931\u6557",
    };
  }
}
