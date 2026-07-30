import { describe, expect, it, vi } from "vitest";
import { runRealtimeSession } from "@/modules/meeting/realtime-session-application";
import type { RealtimeSessionPorts } from "@/modules/meeting/realtime-session-ports";

const agent = {
  slug: "report",
  name: "Ivy 艾薇",
  role: "數據參謀",
  description: "report",
  isTeamLead: false,
};

function createPorts(): RealtimeSessionPorts {
  return {
    history: { load: vi.fn(async () => "history") },
    context: {
      demo: vi.fn(() => "demo"),
      live: vi.fn(async () => "live"),
    },
    provider: { mint: vi.fn(async () => ({ token: "session" })) },
  };
}

describe("Meeting realtime-session application", () => {
  it("returns a stable missing-agent result without touching ports", async () => {
    const ports = createPorts();

    await expect(
      runRealtimeSession(
        { slug: "missing", meetingId: "meeting-1", voice: "alloy", demo: false },
        null,
        ports
      )
    ).resolves.toEqual({ kind: "agent-not-found" });
    expect(ports.history.load).not.toHaveBeenCalled();
    expect(ports.context.live).not.toHaveBeenCalled();
    expect(ports.provider.mint).not.toHaveBeenCalled();
  });

  it("passes the existing profile, history, and demo context to the provider", async () => {
    const ports = createPorts();
    const session = { token: "session", expiresAt: 1 };
    vi.mocked(ports.provider.mint).mockResolvedValue(session);

    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "meeting-1", voice: "coral", demo: true },
        agent,
        ports
      )
    ).resolves.toEqual({ kind: "ok", session });
    expect(ports.history.load).toHaveBeenCalledWith("meeting-1", 8);
    expect(ports.context.demo).toHaveBeenCalledWith("report");
    expect(ports.context.live).not.toHaveBeenCalled();
    expect(ports.provider.mint).toHaveBeenCalledWith({
      agentName: "Ivy 艾薇",
      role: "數據參謀",
      description: "report",
      voice: "coral",
      isTeamLead: false,
      history: "history",
      liveContext: "demo",
    });
  });

  it("does not load history when meetingId is empty and tolerates live-context failure", async () => {
    const ports = createPorts();
    vi.mocked(ports.context.live).mockRejectedValue(new Error("context down"));

    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "", voice: "alloy", demo: false },
        agent,
        ports
      )
    ).resolves.toEqual({ kind: "ok", session: { token: "session" } });
    expect(ports.history.load).not.toHaveBeenCalled();
    expect(ports.provider.mint).toHaveBeenCalledWith(expect.objectContaining({ history: "", liveContext: "" }));
  });

  it("tolerates history failure before minting", async () => {
    const ports = createPorts();
    vi.mocked(ports.history.load).mockRejectedValue(new Error("history down"));

    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "meeting-1", voice: "alloy", demo: false },
        agent,
        ports
      )
    ).resolves.toEqual({ kind: "ok", session: { token: "session" } });
    expect(ports.provider.mint).toHaveBeenCalledWith(expect.objectContaining({ history: "", liveContext: "live" }));
  });

  it("maps provider errors while preserving the existing message rules", async () => {
    const ports = createPorts();
    vi.mocked(ports.provider.mint).mockRejectedValueOnce(new Error("provider down"));

    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "", voice: "alloy", demo: false },
        agent,
        ports
      )
    ).resolves.toEqual({ kind: "mint-failed", message: "provider down" });

    vi.mocked(ports.provider.mint).mockRejectedValueOnce("failed");
    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "", voice: "alloy", demo: false },
        agent,
        ports
      )
    ).resolves.toEqual({ kind: "mint-failed", message: "無法建立即時語音連線" });
  });
});
