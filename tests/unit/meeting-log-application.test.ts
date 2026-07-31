import { describe, expect, it, vi } from "vitest";
import { logMeetingTurn } from "@/modules/meeting/session";
import type { MeetingSessionRepository } from "@/modules/meeting/session";
import { runMeetingRealtimeUsageLog } from "@/modules/meeting/log-usage-application";
import type { MeetingRealtimeUsageLogPort } from "@/modules/meeting/log-usage-ports";

function createTurnRepository(): Pick<MeetingSessionRepository, "appendTurns"> {
  return { appendTurns: vi.fn(async () => undefined) };
}

function createUsagePort(): MeetingRealtimeUsageLogPort {
  return { record: vi.fn(async () => undefined) };
}

describe("Meeting turn logging", () => {
  it("returns the established invalid result before persistence", async () => {
    const repository = createTurnRepository();

    await expect(
      logMeetingTurn(
        { meetingId: "", role: "boss", content: "", agentSlug: undefined, speaker: undefined },
        repository
      )
    ).resolves.toMatchObject({ kind: "invalid" });
    expect(repository.appendTurns).not.toHaveBeenCalled();
  });

  it("uses the session append shape and ignores persistence failure", async () => {
    const repository = createTurnRepository();
    const input = { meetingId: "meeting-1", role: "agent" as const, content: "hello" };
    vi.mocked(repository.appendTurns).mockRejectedValue(new Error("write down"));

    await expect(logMeetingTurn(input, repository)).resolves.toEqual({ kind: "ok" });
    expect(repository.appendTurns).toHaveBeenCalledWith("meeting-1", [
      { role: "agent", content: "hello", agentSlug: undefined, speaker: undefined },
    ]);
  });
});

describe("Meeting realtime usage logging", () => {
  it("returns the established invalid result before usage recording", async () => {
    const port = createUsagePort();

    await expect(
      runMeetingRealtimeUsageLog({ model: "", agentSlug: undefined, usage: {} }, port)
    ).resolves.toMatchObject({ kind: "invalid" });
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
