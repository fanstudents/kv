import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMeeting, finishMeeting, getSignedRecordingUrl, uploadRecording } = vi.hoisted(() => ({
  createMeeting: vi.fn(),
  finishMeeting: vi.fn(),
  getSignedRecordingUrl: vi.fn(),
  uploadRecording: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/meeting-store", () => ({
  createMeeting,
  finishMeeting,
  getSignedRecordingUrl,
  uploadRecording,
}));

import { createLegacyMeetingFinishAdapter } from "@/adapters/meeting/legacy-finish-adapter";
import { createLegacyMeetingRecordingAdapter } from "@/adapters/meeting/legacy-recording-adapter";
import { createLegacyMeetingStartAdapter } from "@/adapters/meeting/legacy-start-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Meeting start adapter", () => {
  it("passes the optional title to createMeeting unchanged", async () => {
    createMeeting.mockResolvedValue("meeting-1");
    const adapter = createLegacyMeetingStartAdapter();

    await expect(adapter.create("週會")).resolves.toBe("meeting-1");
    expect(createMeeting).toHaveBeenCalledWith("週會");
  });
});

describe("legacy Meeting finish adapter", () => {
  it("preserves upload and finish arguments", async () => {
    uploadRecording.mockResolvedValue("meeting-1/recording.webm");
    finishMeeting.mockResolvedValue(undefined);
    const adapter = createLegacyMeetingFinishAdapter();
    const bytes = new ArrayBuffer(4);
    const fields = { transcript: "全文", durationSeconds: 12, recordingPath: "meeting-1/recording.webm" };

    await expect(adapter.uploadRecording("meeting-1", bytes, "webm", "audio/webm")).resolves.toBe(
      "meeting-1/recording.webm"
    );
    await expect(adapter.finishMeeting("meeting-1", fields)).resolves.toBeUndefined();
    expect(uploadRecording).toHaveBeenCalledWith("meeting-1", bytes, "webm", "audio/webm");
    expect(finishMeeting).toHaveBeenCalledWith("meeting-1", fields);
  });
});

describe("legacy Meeting recording adapter", () => {
  it("passes the meeting id to signed URL lookup", async () => {
    getSignedRecordingUrl.mockResolvedValue("https://example.test/recording");
    const adapter = createLegacyMeetingRecordingAdapter();

    await expect(adapter.getSignedUrl("meeting-1")).resolves.toBe("https://example.test/recording");
    expect(getSignedRecordingUrl).toHaveBeenCalledWith("meeting-1");
  });
});
