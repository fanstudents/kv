import { beforeEach, describe, expect, it, vi } from "vitest";

const { synthesizeSpeech, transcribeAudio } = vi.hoisted(() => ({
  synthesizeSpeech: vi.fn(),
  transcribeAudio: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/openai", () => ({ synthesizeSpeech, transcribeAudio }));

import { createLegacyMeetingSpeakAdapter } from "@/adapters/meeting/legacy-speak-adapter";
import { createLegacyMeetingTranscribeAdapter } from "@/adapters/meeting/legacy-transcribe-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Meeting speak adapter", () => {
  it("passes the complete TTS config through unchanged", async () => {
    const audio = new ArrayBuffer(3);
    synthesizeSpeech.mockResolvedValue(audio);
    const adapter = createLegacyMeetingSpeakAdapter();
    const input = { text: "回報", voice: "coral", instructions: "快一點", speed: 1.2 };

    await expect(adapter.synthesize(input)).resolves.toBe(audio);
    expect(synthesizeSpeech).toHaveBeenCalledWith(input);
  });
});

describe("legacy Meeting transcribe adapter", () => {
  it("passes the audio as the OpenAI Blob input and keeps promptHint", async () => {
    transcribeAudio.mockResolvedValue("轉錄結果");
    const adapter = createLegacyMeetingTranscribeAdapter();
    const audio = { arrayBuffer: async () => new ArrayBuffer(2) };

    await expect(adapter.transcribe({ audio, promptHint: "Ivy" })).resolves.toBe("轉錄結果");
    expect(transcribeAudio).toHaveBeenCalledWith({ file: audio, promptHint: "Ivy" });
  });
});
