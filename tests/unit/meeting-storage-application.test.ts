import { describe, expect, it, vi } from "vitest";
import { runMeetingFinish } from "@/modules/meeting/finish-application";
import type { MeetingFinishPort } from "@/modules/meeting/finish-ports";
import { runMeetingRecording } from "@/modules/meeting/recording-application";
import type { MeetingRecordingPort } from "@/modules/meeting/recording-ports";
import { runMeetingStart } from "@/modules/meeting/start-application";
import type { MeetingStartPort } from "@/modules/meeting/start-ports";

function createStartPort(): MeetingStartPort {
  return { create: vi.fn(async () => "meeting-1") };
}

function createFinishPort(): MeetingFinishPort {
  return {
    uploadRecording: vi.fn(async () => "meeting-1/recording.webm"),
    finishMeeting: vi.fn(async () => undefined),
  };
}

function createRecordingPort(): MeetingRecordingPort {
  return { getSignedUrl: vi.fn(async () => "https://example.test/recording") };
}

describe("Meeting start application", () => {
  it("maps a created id and keeps the title on the port", async () => {
    const port = createStartPort();

    await expect(runMeetingStart({ title: "週會" }, port)).resolves.toEqual({
      kind: "created",
      id: "meeting-1",
    });
    expect(port.create).toHaveBeenCalledWith("週會");
  });

  it("maps a null legacy id to the existing 500 result", async () => {
    const port = createStartPort();
    vi.mocked(port.create).mockResolvedValue(null);

    await expect(runMeetingStart({ title: undefined }, port)).resolves.toEqual({ kind: "create-failed" });
  });
});

describe("Meeting finish application", () => {
  it("rejects before storage calls when meetingId is empty", async () => {
    const port = createFinishPort();

    await expect(
      runMeetingFinish({ meetingId: "", transcript: undefined, durationSeconds: undefined }, port)
    ).resolves.toEqual({ kind: "invalid", message: "缺少 meetingId" });
    expect(port.uploadRecording).not.toHaveBeenCalled();
    expect(port.finishMeeting).not.toHaveBeenCalled();
  });

  it("uploads audio, then finishes with the existing fields", async () => {
    const port = createFinishPort();
    const audio = { type: "audio/ogg", arrayBuffer: vi.fn(async () => new ArrayBuffer(3)) };

    await expect(
      runMeetingFinish({ meetingId: "meeting-1", transcript: "全文", durationSeconds: 12.5, audio }, port)
    ).resolves.toEqual({ kind: "ok", recordingSaved: true });
    expect(port.uploadRecording).toHaveBeenCalledWith("meeting-1", expect.any(ArrayBuffer), "ogg", "audio/ogg");
    expect(port.finishMeeting).toHaveBeenCalledWith("meeting-1", {
      transcript: "全文",
      durationSeconds: 12.5,
      recordingPath: "meeting-1/recording.webm",
    });
  });

  it("still finishes when audio upload fails and records a null path", async () => {
    const port = createFinishPort();
    vi.mocked(port.uploadRecording).mockRejectedValue(new Error("storage down"));
    const audio = { type: "audio/webm", arrayBuffer: vi.fn(async () => new ArrayBuffer(0)) };

    await expect(runMeetingFinish({ meetingId: "meeting-1", audio }, port)).resolves.toEqual({
      kind: "ok",
      recordingSaved: false,
    });
    expect(port.finishMeeting).toHaveBeenCalledWith("meeting-1", {
      transcript: undefined,
      durationSeconds: undefined,
      recordingPath: null,
    });
  });
});

describe("Meeting recording application", () => {
  it("maps missing, not-found, and signed URL results", async () => {
    const port = createRecordingPort();

    await expect(runMeetingRecording({ meetingId: "" }, port)).resolves.toEqual({
      kind: "invalid",
      message: "缺少 id",
    });
    expect(port.getSignedUrl).not.toHaveBeenCalled();

    vi.mocked(port.getSignedUrl).mockResolvedValueOnce(null);
    await expect(runMeetingRecording({ meetingId: "missing" }, port)).resolves.toEqual({
      kind: "not-found",
      message: "找不到錄音檔",
    });

    await expect(runMeetingRecording({ meetingId: "meeting-1" }, port)).resolves.toEqual({
      kind: "ok",
      url: "https://example.test/recording",
    });
  });
});
