import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPEAK_INSTRUCTIONS,
  DEFAULT_SPEAK_SPEED,
  parseMeetingSpeakRequest,
} from "@/modules/meeting/speak-rules";
import { parseMeetingTranscribeForm } from "@/modules/meeting/transcribe-rules";

describe("Meeting speak request rules", () => {
  it("preserves text trimming and the current voice/instruction/speed defaults", () => {
    expect(parseMeetingSpeakRequest({ text: "  回報  ", voice: "coral", speed: 1.5 })).toEqual({
      text: "回報",
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
  });

  it("keeps string instructions and drops malformed values", () => {
    expect(parseMeetingSpeakRequest({ text: "x", instructions: "慢一點", speed: "fast" })).toEqual({
      text: "x",
      voice: "alloy",
      instructions: "慢一點",
      speed: DEFAULT_SPEAK_SPEED,
    });
  });
});

describe("Meeting transcribe multipart rules", () => {
  it("preserves an audio object with arrayBuffer and prompt hint", () => {
    const audio = { arrayBuffer: async () => new ArrayBuffer(2) };
    const values = new Map<string, unknown>([["audio", audio], ["promptHint", "Ivy"]]);

    expect(parseMeetingTranscribeForm({ get: (name) => values.get(name) ?? null })).toEqual({
      audio,
      promptHint: "Ivy",
    });
  });

  it("keeps missing audio and empty hint as undefined", () => {
    const values = new Map<string, unknown>([["audio", null], ["promptHint", ""]]);
    expect(parseMeetingTranscribeForm({ get: (name) => values.get(name) ?? null })).toEqual({
      audio: undefined,
      promptHint: undefined,
    });
  });
});
