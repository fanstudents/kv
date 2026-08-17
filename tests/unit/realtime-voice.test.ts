import { describe, expect, it, vi } from "vitest";
import { RealtimeVoiceSession } from "@/lib/realtime-voice";

function dispatch(session: RealtimeVoiceSession, event: unknown): void {
  (session as unknown as { handleEvent(raw: string): void }).handleEvent(JSON.stringify(event));
}

describe("RealtimeVoiceSession assistant transcript events", () => {
  it("handles the current audio transcript delta and done events once", () => {
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const session = new RealtimeVoiceSession({ onAssistantTranscriptDelta: onDelta, onAssistantTranscriptDone: onDone });

    dispatch(session, { type: "response.output_audio_transcript.delta", delta: "你好" });
    dispatch(session, { type: "response.output_audio_transcript.done", transcript: "你好，請問。" });

    expect(onDelta).toHaveBeenCalledTimes(1);
    expect(onDelta).toHaveBeenCalledWith("你好");
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith("你好，請問。");
  });

  it("ignores obsolete and unknown transcript events without duplicating a persisted turn", () => {
    const persistedTurns: string[] = [];
    const onDelta = vi.fn();
    const onDone = vi.fn((text: string) => persistedTurns.push(text));
    const session = new RealtimeVoiceSession({ onAssistantTranscriptDelta: onDelta, onAssistantTranscriptDone: onDone });

    dispatch(session, { type: "response.output_audio_transcript.done", transcript: "完成回覆" });
    dispatch(session, { type: "response.audio_transcript.delta", delta: "舊事件" });
    dispatch(session, { type: "response.audio_transcript.done", transcript: "舊事件" });
    dispatch(session, { type: "response.unknown", transcript: "未知事件" });

    expect(onDelta).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(persistedTurns).toEqual(["完成回覆"]);
  });
});
