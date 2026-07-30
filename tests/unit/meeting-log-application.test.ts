import { describe, expect, it, vi } from "vitest";
import { runMeetingTurnLog } from "@/modules/meeting/log-turn-application";
import type { MeetingTurnLogPort } from "@/modules/meeting/log-turn-ports";
import { runMeetingRealtimeUsageLog } from "@/modules/meeting/log-usage-application";
import type { MeetingRealtimeUsageLogPort } from "@/modules/meeting/log-usage-ports";

function createTurnPort(): MeetingTurnLogPort {
  return { append: vi.fn(async () => undefined) };
}

function createUsagePort(): MeetingRealtimeUsageLogPort {
  return { record: vi.fn(async () => undefined) };
}

describe("Meeting log-turn application", () => {
  it("returns the existing 400 contract before persistence", async () => {
    const port = createTurnPort();

    await expect(
      runMeetingTurnLog(
        { meetingId: "", role: "boss", content: "", agentSlug: undefined, speaker: undefined },
        port
      )
    ).resolves.toEqual({ kind: "invalid", message: "缺少 meetingId 或 content" });
    expect(port.append).not.toHaveBeenCalled();
  });

  it("passes the request through and ignores persistence failure", async () => {
    const port = createTurnPort();
    const input = { meetingId: "meeting-1", role: "agent" as const, content: "收到" };
    vi.mocked(port.append).mockRejectedValue(new Error("write down"));

    await expect(runMeetingTurnLog(input, port)).resolves.toEqual({ kind: "ok" });
    expect(port.append).toHaveBeenCalledWith(input);
  });
});

describe("Meeting log-usage application", () => {
  it("returns the existing 400 contract before usage recording", async () => {
    const port = createUsagePort();

    await expect(
      runMeetingRealtimeUsageLog({ model: "", agentSlug: undefined, usage: {} }, port)
    ).resolves.toEqual({ kind: "invalid", message: "缺少 model" });
    expect(port.record).not.toHaveBeenCalled();
  });

  it("passes the complete usage request through unchanged", async () => {
    const port = createUsagePort();
    const input = { model: "gpt-realtime-2.1", agentSlug: "report", usage: { total_tokens: 4 } };

    await expect(runMeetingRealtimeUsageLog(input, port)).resolves.toEqual({ kind: "ok" });
    expect(port.record).toHaveBeenCalledWith(input);
  });

  it("does not add a new catch boundary around provider failures", async () => {
    const port = createUsagePort();
    vi.mocked(port.record).mockRejectedValue(new Error("unexpected"));

    await expect(
      runMeetingRealtimeUsageLog({ model: "model", agentSlug: undefined, usage: {} }, port)
    ).rejects.toThrow("unexpected");
  });
});
