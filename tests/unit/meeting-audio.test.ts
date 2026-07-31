import { beforeEach, describe, expect, it, vi } from "vitest";

const { synthesizeSpeech, transcribeAudio } = vi.hoisted(() => ({
  synthesizeSpeech: vi.fn(),
  transcribeAudio: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/openai", () => ({ synthesizeSpeech, transcribeAudio }));

import { createOpenAiMeetingAudioProvider } from "@/adapters/meeting/openai-audio-provider";
import {
  DEFAULT_SPEAK_INSTRUCTIONS,
  DEFAULT_SPEAK_SPEED,
  parseMeetingSpeakRequest,
  parseMeetingTranscribeForm,
  speakMeeting,
  transcribeMeeting,
} from "@/modules/meeting/audio";
import type { MeetingAudioProvider } from "@/modules/meeting/audio";

beforeEach(() => vi.clearAllMocks());

describe("Meeting audio request parsing", () => {
  it("keeps speak text trimming and voice/instruction/speed defaults", () => {
    expect(parseMeetingSpeakRequest({ text: "  hello  ", voice: "coral", speed: 1.5 })).toEqual({
      text: "hello",
      voice: "coral",
      instructions: DEFAULT_SPEAK_INSTRUCTIONS,
      speed: 1.5,
    });
    expect(parseMeetingSpeakRequest(null)).toEqual({
      text: "",
      voice: "alloy",
      instructions: DEFAULT_SPEAK_INSTRUCTIONS,
      speed: DEFAULT_SPEAK_SPEED,
    });
    expect(parseMeetingSpeakRequest({ text: "x", instructions: "keep this", speed: "fast" })).toEqual({
      text: "x",
      voice: "alloy",
      instructions: "keep this",
      speed: DEFAULT_SPEAK_SPEED,
    });
  });

  it("keeps multipart audio detection and prompt defaults", () => {
    const audio = { arrayBuffer: async () => new ArrayBuffer(2) };
    const values = new Map<string, unknown>([["audio", audio], ["promptHint", "Ivy"]]);
    expect(parseMeetingTranscribeForm({ get: (name) => values.get(name) ?? null })).toEqual({
      audio,
      promptHint: "Ivy",
    });

    const empty = new Map<string, unknown>([["audio", null], ["promptHint", ""]]);
    expect(parseMeetingTranscribeForm({ get: (name) => empty.get(name) ?? null })).toEqual({
      audio: undefined,
      promptHint: undefined,
    });
  });
});

describe("Meeting audio behavior", () => {
  it("rejects missing speak text and missing transcription audio before provider calls", async () => {
    const provider = {
      synthesize: vi.fn(),
      transcribe: vi.fn(),
    } satisfies MeetingAudioProvider;

    await expect(
      speakMeeting({ text: "", voice: "alloy", instructions: "", speed: 1.2 }, provider)
    ).resolves.toEqual({ kind: "invalid", message: "\u7f3a\u5c11\u6587\u5b57\u5167\u5bb9" });
    await expect(transcribeMeeting({ promptHint: "meeting" }, provider)).resolves.toEqual({
      kind: "invalid",
      message: "\u7f3a\u5c11\u97f3\u8a0a\u6a94\u6848",
    });
    expect(provider.synthesize).not.toHaveBeenCalled();
    expect(provider.transcribe).not.toHaveBeenCalled();
  });

  it("passes opaque audio and transcription values through unchanged", async () => {
    const audio = new ArrayBuffer(3);
    const source = { arrayBuffer: vi.fn(async () => new ArrayBuffer(2)) };
    const provider = {
      synthesize: vi.fn(async () => audio),
      transcribe: vi.fn(async () => "transcript"),
    } satisfies MeetingAudioProvider;
    const speakInput = { text: "hello", voice: "alloy", instructions: "brief", speed: 1.2 };

    await expect(speakMeeting(speakInput, provider)).resolves.toEqual({ kind: "ok", audio });
    await expect(transcribeMeeting({ audio: source, promptHint: "Ivy" }, provider)).resolves.toEqual({
      kind: "ok",
      text: "transcript",
    });
    expect(provider.synthesize).toHaveBeenCalledWith(speakInput);
    expect(provider.transcribe).toHaveBeenCalledWith({ audio: source, promptHint: "Ivy" });
  });

  it("keeps provider error and non-error fallback semantics", async () => {
    const speakInput = { text: "hello", voice: "alloy", instructions: "brief", speed: 1.2 };
    const source = { arrayBuffer: vi.fn(async () => new ArrayBuffer(2)) };

    await expect(
      speakMeeting(speakInput, { synthesize: vi.fn(async () => { throw new Error("tts down"); }) })
    ).resolves.toEqual({ kind: "provider-failed", message: "tts down" });
    await expect(
      speakMeeting(speakInput, { synthesize: vi.fn(async () => { throw "offline"; }) })
    ).resolves.toEqual({ kind: "provider-failed", message: "\u8a9e\u97f3\u5408\u6210\u5931\u6557" });
    await expect(
      transcribeMeeting({ audio: source }, { transcribe: vi.fn(async () => { throw new Error("asr down"); }) })
    ).resolves.toEqual({ kind: "provider-failed", message: "asr down" });
    await expect(
      transcribeMeeting({ audio: source }, { transcribe: vi.fn(async () => { throw "offline"; }) })
    ).resolves.toEqual({ kind: "provider-failed", message: "\u8a9e\u97f3\u8fa8\u8b58\u5931\u6557" });
  });
});

describe("OpenAI Meeting audio provider", () => {
  it("forwards TTS configuration and transcription file/prompt unchanged", async () => {
    const provider = createOpenAiMeetingAudioProvider();
    const audio = new ArrayBuffer(3);
    const source = { arrayBuffer: async () => new ArrayBuffer(2) };
    const speakInput = { text: "hello", voice: "coral", instructions: "brief", speed: 1.2 };
    synthesizeSpeech.mockResolvedValue(audio);
    transcribeAudio.mockResolvedValue("transcript");

    await expect(provider.synthesize(speakInput)).resolves.toBe(audio);
    await expect(provider.transcribe({ audio: source, promptHint: "Ivy" })).resolves.toBe("transcript");
    expect(synthesizeSpeech).toHaveBeenCalledWith(speakInput);
    expect(transcribeAudio).toHaveBeenCalledWith({ file: source, promptHint: "Ivy" });
  });
});
