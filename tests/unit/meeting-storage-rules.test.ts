import { describe, expect, it } from "vitest";
import { parseMeetingFinishForm, recordingDescriptor } from "@/modules/meeting/finish-rules";
import { parseMeetingRecordingRequest } from "@/modules/meeting/recording-rules";
import { parseMeetingStartRequest } from "@/modules/meeting/start-rules";

describe("Meeting start request rules", () => {
  it("keeps a string title and drops non-string titles", () => {
    expect(parseMeetingStartRequest({ title: "週會" })).toEqual({ title: "週會" });
    expect(parseMeetingStartRequest({ title: 1 })).toEqual({ title: undefined });
    expect(parseMeetingStartRequest(null)).toEqual({ title: undefined });
  });
});

describe("Meeting finish form rules", () => {
  it("preserves the existing multipart coercion and audio fields", () => {
    const audio = { type: "audio/mp4", arrayBuffer: async () => new ArrayBuffer(2) };
    const values = new Map<string, unknown>([
      ["meetingId", "meeting-1"],
      ["transcript", "全文"],
      ["durationSeconds", "12.5"],
      ["audio", audio],
    ]);
    const form = { get: (name: string) => values.get(name) ?? null };

    expect(parseMeetingFinishForm(form)).toEqual({
      meetingId: "meeting-1",
      transcript: "全文",
      durationSeconds: 12.5,
      audio,
    });
    expect(recordingDescriptor(audio)).toEqual({ ext: "mp4", contentType: "audio/mp4" });
  });

  it("keeps empty and malformed values at their current defaults", () => {
    const values = new Map<string, unknown>([
      ["meetingId", null],
      ["transcript", ""],
      ["durationSeconds", ""],
      ["audio", "not-a-file"],
    ]);
    expect(parseMeetingFinishForm({ get: (name) => values.get(name) ?? null })).toEqual({
      meetingId: "",
      transcript: undefined,
      durationSeconds: undefined,
      audio: undefined,
    });
  });

  it("uses webm by default and recognizes ogg", () => {
    const defaultAudio = { arrayBuffer: async () => new ArrayBuffer(0) };
    const oggAudio = { type: "audio/ogg; codecs=opus", arrayBuffer: async () => new ArrayBuffer(0) };
    expect(recordingDescriptor(defaultAudio)).toEqual({ ext: "webm", contentType: "audio/webm" });
    expect(recordingDescriptor(oggAudio)).toEqual({ ext: "ogg", contentType: "audio/ogg; codecs=opus" });
  });
});

describe("Meeting recording request rules", () => {
  it("keeps the existing query id default", () => {
    expect(parseMeetingRecordingRequest("meeting-1")).toEqual({ meetingId: "meeting-1" });
    expect(parseMeetingRecordingRequest(null)).toEqual({ meetingId: "" });
  });
});
