import { describe, expect, it, vi } from "vitest";
import { runMeetingSpeak } from "@/modules/meeting/speak-application";
import { runMeetingTranscribe } from "@/modules/meeting/transcribe-application";

const speakInput = {
  text: "請開始會議",
  voice: "alloy",
  instructions: "語氣自然",
  speed: 1.2,
};

describe("meeting audio applications", () => {
  it("returns invalid without invoking speak provider when text is missing", async () => {
    const port = { synthesize: vi.fn() };

    await expect(runMeetingSpeak({ ...speakInput, text: "" }, port)).resolves.toEqual({
      kind: "invalid",
      message: "缺少文字內容",
    });
    expect(port.synthesize).not.toHaveBeenCalled();
  });

  it("returns the opaque speak audio from the provider", async () => {
    const audio = new ArrayBuffer(3);
    const port = { synthesize: vi.fn().mockResolvedValue(audio) };

    await expect(runMeetingSpeak(speakInput, port)).resolves.toEqual({ kind: "ok", audio });
    expect(port.synthesize).toHaveBeenCalledWith(speakInput);
  });

  it("maps speak provider failures and non-error throws", async () => {
    const errorPort = { synthesize: vi.fn().mockRejectedValue(new Error("tts down")) };
    const fallbackPort = { synthesize: vi.fn().mockRejectedValue("offline") };

    await expect(runMeetingSpeak(speakInput, errorPort)).resolves.toEqual({
      kind: "provider-failed",
      message: "tts down",
    });
    await expect(runMeetingSpeak(speakInput, fallbackPort)).resolves.toEqual({
      kind: "provider-failed",
      message: "語音合成失敗",
    });
  });

  it("returns invalid without invoking transcribe provider when audio is missing", async () => {
    const port = { transcribe: vi.fn() };

    await expect(runMeetingTranscribe({ promptHint: "會議" }, port)).resolves.toEqual({
      kind: "invalid",
      message: "缺少音訊檔案",
    });
    expect(port.transcribe).not.toHaveBeenCalled();
  });

  it("returns transcription text and preserves the provider input", async () => {
    const audio = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(2)) };
    const port = { transcribe: vi.fn().mockResolvedValue("已轉錄") };

    await expect(runMeetingTranscribe({ audio, promptHint: "產品會議" }, port)).resolves.toEqual({
      kind: "ok",
      text: "已轉錄",
    });
    expect(port.transcribe).toHaveBeenCalledWith({ audio, promptHint: "產品會議" });
  });

  it("maps transcribe provider failures and non-error throws", async () => {
    const audio = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(2)) };
    const errorPort = { transcribe: vi.fn().mockRejectedValue(new Error("asr down")) };
    const fallbackPort = { transcribe: vi.fn().mockRejectedValue("offline") };

    await expect(runMeetingTranscribe({ audio }, errorPort)).resolves.toEqual({
      kind: "provider-failed",
      message: "asr down",
    });
    await expect(runMeetingTranscribe({ audio }, fallbackPort)).resolves.toEqual({
      kind: "provider-failed",
      message: "語音辨識失敗",
    });
  });
});
