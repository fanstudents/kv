import { beforeEach, describe, expect, it, vi } from "vitest";

const { appendTurns, createMeeting, finishMeeting, getRecentHistory, getSignedRecordingUrl, uploadRecording } = vi.hoisted(() => ({
  appendTurns: vi.fn(),
  createMeeting: vi.fn(),
  finishMeeting: vi.fn(),
  getRecentHistory: vi.fn(),
  getSignedRecordingUrl: vi.fn(),
  uploadRecording: vi.fn(),
}));

vi.mock("@/lib/meeting-store", () => ({
  appendTurns,
  createMeeting,
  finishMeeting,
  getRecentHistory,
  getSignedRecordingUrl,
  uploadRecording,
}));

import { createMeetingSessionRepository } from "@/adapters/meeting/meeting-session-repository";
import {
  finishMeetingSession,
  getMeetingRecording,
  logMeetingTurn,
  parseMeetingFinishForm,
  parseMeetingRecordingRequest,
  parseMeetingStartRequest,
  parseMeetingTurnLogRequest,
  recordingDescriptor,
  startMeeting,
} from "@/modules/meeting/session";
import type { MeetingSessionRepository } from "@/modules/meeting/session";

beforeEach(() => vi.clearAllMocks());

describe("Meeting session request parsing", () => {
  it("keeps the established start request coercion", () => {
    expect(parseMeetingStartRequest({ title: "Planning" })).toEqual({ title: "Planning" });
    expect(parseMeetingStartRequest({ title: 1 })).toEqual({ title: undefined });
    expect(parseMeetingStartRequest(null)).toEqual({ title: undefined });
  });

  it("keeps multipart finish coercion and recording descriptors", () => {
    const audio = { type: "audio/mp4", arrayBuffer: async () => new ArrayBuffer(2) };
    const values = new Map<string, unknown>([
      ["meetingId", "meeting-1"],
      ["transcript", "notes"],
      ["durationSeconds", "12.5"],
      ["audio", audio],
    ]);

    expect(parseMeetingFinishForm({ get: (name) => values.get(name) ?? null })).toEqual({
      meetingId: "meeting-1",
      transcript: "notes",
      durationSeconds: 12.5,
      audio,
    });
    expect(recordingDescriptor(audio)).toEqual({ ext: "mp4", contentType: "audio/mp4" });
    expect(recordingDescriptor({ arrayBuffer: async () => new ArrayBuffer(0) })).toEqual({
      ext: "webm",
      contentType: "audio/webm",
    });
    expect(recordingDescriptor({ type: "audio/ogg; codecs=opus", arrayBuffer: async () => new ArrayBuffer(0) })).toEqual({
      ext: "ogg",
      contentType: "audio/ogg; codecs=opus",
    });
  });

  it("keeps empty form and recording query defaults", () => {
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
    expect(parseMeetingRecordingRequest("meeting-1")).toEqual({ meetingId: "meeting-1" });
    expect(parseMeetingRecordingRequest(null)).toEqual({ meetingId: "" });
  });

  it("preserves turn request coercion, trim, and role defaults", () => {
    expect(
      parseMeetingTurnLogRequest({
        meetingId: "meeting-1",
        role: "agent",
        content: "  hello  ",
        agentSlug: "report",
        speaker: "Ivy",
      })
    ).toEqual({
      meetingId: "meeting-1",
      role: "agent",
      content: "hello",
      agentSlug: "report",
      speaker: "Ivy",
    });
    expect(parseMeetingTurnLogRequest({ role: "invalid", content: "x" }).role).toBe("boss");
    expect(parseMeetingTurnLogRequest({ meetingId: 1, content: 2, agentSlug: null, speaker: false })).toEqual({
      meetingId: "",
      role: "boss",
      content: "",
      agentSlug: undefined,
      speaker: undefined,
    });
  });
});

describe("Meeting session behavior", () => {
  it("starts a meeting and keeps create failure distinct", async () => {
    const create = vi.fn(async (): Promise<string | null> => "meeting-1");
    const repository = { create } satisfies Pick<MeetingSessionRepository, "create">;

    await expect(startMeeting({ title: "Planning" }, repository)).resolves.toEqual({
      kind: "created",
      id: "meeting-1",
    });
    expect(repository.create).toHaveBeenCalledWith("Planning");

    create.mockResolvedValueOnce(null);
    await expect(startMeeting({}, repository)).resolves.toEqual({ kind: "create-failed" });
  });

  it("finishes with the persisted recording path and tolerates upload failure", async () => {
    const repository = {
      uploadRecording: vi.fn(async () => "meeting-1/recording.webm"),
      finishMeeting: vi.fn(async () => undefined),
    } satisfies Pick<MeetingSessionRepository, "uploadRecording" | "finishMeeting">;
    const audio = { type: "audio/ogg", arrayBuffer: vi.fn(async () => new ArrayBuffer(3)) };

    await expect(
      finishMeetingSession({ meetingId: "meeting-1", transcript: "notes", durationSeconds: 12.5, audio }, repository)
    ).resolves.toEqual({ kind: "ok", recordingSaved: true });
    expect(repository.uploadRecording).toHaveBeenCalledWith("meeting-1", expect.any(ArrayBuffer), "ogg", "audio/ogg");
    expect(repository.finishMeeting).toHaveBeenCalledWith("meeting-1", {
      transcript: "notes",
      durationSeconds: 12.5,
      recordingPath: "meeting-1/recording.webm",
    });

    repository.uploadRecording.mockRejectedValueOnce(new Error("storage down"));
    await expect(finishMeetingSession({ meetingId: "meeting-1", audio }, repository)).resolves.toEqual({
      kind: "ok",
      recordingSaved: false,
    });
    expect(repository.finishMeeting).toHaveBeenLastCalledWith("meeting-1", {
      transcript: undefined,
      durationSeconds: undefined,
      recordingPath: null,
    });
  });

  it("rejects incomplete input before storage calls", async () => {
    const repository = {
      uploadRecording: vi.fn(),
      finishMeeting: vi.fn(),
      appendTurns: vi.fn(),
      getSignedRecordingUrl: vi.fn(),
    } satisfies Pick<MeetingSessionRepository, "uploadRecording" | "finishMeeting" | "appendTurns" | "getSignedRecordingUrl">;

    await expect(finishMeetingSession({ meetingId: "" }, repository)).resolves.toMatchObject({ kind: "invalid" });
    await expect(
      logMeetingTurn({ meetingId: "", role: "boss", content: "" }, repository)
    ).resolves.toMatchObject({ kind: "invalid" });
    await expect(getMeetingRecording({ meetingId: "" }, repository)).resolves.toMatchObject({ kind: "invalid" });
    expect(repository.uploadRecording).not.toHaveBeenCalled();
    expect(repository.finishMeeting).not.toHaveBeenCalled();
    expect(repository.appendTurns).not.toHaveBeenCalled();
    expect(repository.getSignedRecordingUrl).not.toHaveBeenCalled();
  });

  it("logs a normalized turn, ignores an append failure, and maps signed recording lookup", async () => {
    const repository = {
      appendTurns: vi.fn(async () => undefined),
      getSignedRecordingUrl: vi.fn(async () => "https://example.test/recording"),
    } satisfies Pick<MeetingSessionRepository, "appendTurns" | "getSignedRecordingUrl">;

    await expect(
      logMeetingTurn(
        { meetingId: "meeting-1", role: "agent", content: "hello", agentSlug: "report", speaker: "Ivy" },
        repository
      )
    ).resolves.toEqual({ kind: "ok" });
    expect(repository.appendTurns).toHaveBeenCalledWith("meeting-1", [
      { role: "agent", content: "hello", agentSlug: "report", speaker: "Ivy" },
    ]);

    repository.appendTurns.mockRejectedValueOnce(new Error("write down"));
    await expect(
      logMeetingTurn({ meetingId: "meeting-1", role: "boss", content: "continue" }, repository)
    ).resolves.toEqual({ kind: "ok" });

    await expect(getMeetingRecording({ meetingId: "missing" }, {
      getSignedRecordingUrl: vi.fn(async () => null),
    })).resolves.toMatchObject({ kind: "not-found" });
    await expect(getMeetingRecording({ meetingId: "meeting-1" }, repository)).resolves.toEqual({
      kind: "ok",
      url: "https://example.test/recording",
    });
  });
});

describe("Meeting session repository", () => {
  it("forwards session persistence calls to the established store boundary", async () => {
    const repository = createMeetingSessionRepository();
    const bytes = new ArrayBuffer(4);
    const turns = [{ role: "agent" as const, agentSlug: "report", speaker: "Ivy", content: "hello" }];
    const fields = { transcript: "notes", durationSeconds: 12, recordingPath: "meeting-1/recording.webm" };
    createMeeting.mockResolvedValue("meeting-1");
    getRecentHistory.mockResolvedValue("history");
    appendTurns.mockResolvedValue(undefined);
    uploadRecording.mockResolvedValue("meeting-1/recording.webm");
    finishMeeting.mockResolvedValue(undefined);
    getSignedRecordingUrl.mockResolvedValue("https://example.test/recording");

    await expect(repository.create("Planning")).resolves.toBe("meeting-1");
    await expect(repository.getHistory("meeting-1", 8)).resolves.toBe("history");
    await expect(repository.appendTurns("meeting-1", turns)).resolves.toBeUndefined();
    await expect(repository.uploadRecording("meeting-1", bytes, "webm", "audio/webm")).resolves.toBe(
      "meeting-1/recording.webm"
    );
    await expect(repository.finishMeeting("meeting-1", fields)).resolves.toBeUndefined();
    await expect(repository.getSignedRecordingUrl("meeting-1")).resolves.toBe("https://example.test/recording");
    expect(createMeeting).toHaveBeenCalledWith("Planning");
    expect(getRecentHistory).toHaveBeenCalledWith("meeting-1", 8);
    expect(appendTurns).toHaveBeenCalledWith("meeting-1", turns);
    expect(uploadRecording).toHaveBeenCalledWith("meeting-1", bytes, "webm", "audio/webm");
    expect(finishMeeting).toHaveBeenCalledWith("meeting-1", fields);
    expect(getSignedRecordingUrl).toHaveBeenCalledWith("meeting-1");
  });
});
