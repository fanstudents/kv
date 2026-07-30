import { describe, expect, it, vi } from "vitest";
import { runMeetingCommand } from "@/modules/meeting/command-application";
import type { MeetingCommandPorts } from "@/modules/meeting/command-ports";
import type { MeetingCommandRoster } from "@/modules/meeting/command-application";

const teamLead = {
  slug: "teamlead",
  name: "總管 Agent",
  role: "Team Lead 大總管",
  description: "lead",
  personEn: "Vivian",
  personZh: "薇薇安",
  status: "active",
};
const report = {
  slug: "report",
  name: "數據 Agent",
  role: "數據參謀",
  description: "report",
  personEn: "Ivy",
  personZh: "艾薇",
  status: "active",
};

function createPorts(): MeetingCommandPorts {
  return {
    history: { load: vi.fn(async () => "history") },
    replies: {
      oneToOne: vi.fn(async () => "one reply"),
      round: vi.fn(async () => ({ replies: [{ slug: "report", text: "report reply" }], teamlead: "summary" })),
    },
    turns: { append: vi.fn(async () => undefined) },
  };
}

const input = { meetingId: "meeting-1", command: "go", targetSlug: "" };
const roster: MeetingCommandRoster = { teamLead, responders: [report], target: null };

describe("Meeting command application", () => {
  it("returns a stable error before side effects when Team Lead is absent", async () => {
    const ports = createPorts();

    await expect(runMeetingCommand(input, { ...roster, teamLead: null }, ports)).resolves.toEqual({
      kind: "teamlead-not-found",
    });
    expect(ports.history.load).not.toHaveBeenCalled();
  });

  it("returns a stable target error before provider calls", async () => {
    const ports = createPorts();

    await expect(
      runMeetingCommand({ ...input, targetSlug: "missing" }, roster, ports)
    ).resolves.toEqual({ kind: "target-not-found" });
    expect(ports.replies.oneToOne).not.toHaveBeenCalled();
  });

  it("isolates history failure for one-to-one replies and persists the fallback", async () => {
    const ports = createPorts();
    vi.mocked(ports.history.load).mockRejectedValue(new Error("history down"));
    vi.mocked(ports.replies.oneToOne).mockResolvedValue("");

    await expect(
      runMeetingCommand({ ...input, targetSlug: "report" }, { ...roster, target: report }, ports)
    ).resolves.toEqual({
      kind: "one-to-one",
      reply: { slug: "report", name: "Ivy 艾薇", text: "收到，我馬上處理，稍後回報進度給您。" },
    });
    expect(ports.replies.oneToOne).toHaveBeenCalledWith(
      expect.objectContaining({ history: "" })
    );
    expect(ports.turns.append).toHaveBeenCalledWith(
      "meeting-1",
      expect.arrayContaining([expect.objectContaining({ content: "收到，我馬上處理，稍後回報進度給您。" })])
    );
  });

  it("maps batch replies and ignores turn persistence failure", async () => {
    const ports = createPorts();
    vi.mocked(ports.turns.append).mockRejectedValue(new Error("write down"));

    await expect(runMeetingCommand(input, roster, ports)).resolves.toEqual({
      kind: "round",
      replies: [{ slug: "report", name: "Ivy 艾薇", text: "report reply" }],
      teamlead: { slug: "teamlead", name: "Vivian 薇薇安", text: "summary" },
    });
    expect(ports.replies.round).toHaveBeenCalledWith(
      expect.objectContaining({ teamLead: expect.objectContaining({ slug: "teamlead" }) })
    );
  });

  it("returns the existing provider error and skips turn persistence", async () => {
    const ports = createPorts();
    vi.mocked(ports.replies.round).mockRejectedValue("failed");

    await expect(runMeetingCommand(input, roster, ports)).resolves.toEqual({
      kind: "reply-failed",
      message: "會議回應失敗",
    });
    expect(ports.turns.append).not.toHaveBeenCalled();
  });
});
