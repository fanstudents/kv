import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAgentDemoContext, getAgentLiveContext, getRecentHistory, mintRealtimeSession } = vi.hoisted(() => ({
  getAgentDemoContext: vi.fn(),
  getAgentLiveContext: vi.fn(),
  getRecentHistory: vi.fn(),
  mintRealtimeSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/meeting-demo-context", () => ({ getAgentDemoContext }));
vi.mock("@/lib/meeting-context", () => ({ getAgentLiveContext }));
vi.mock("@/lib/meeting-store", () => ({ getRecentHistory }));
vi.mock("@/lib/openai", () => ({ mintRealtimeSession }));

import { createLegacyRealtimeSessionAdapter } from "@/adapters/meeting/legacy-realtime-session-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy realtime-session adapter", () => {
  it("preserves the history limit and demo/live context helpers", async () => {
    getRecentHistory.mockResolvedValue("history");
    getAgentDemoContext.mockReturnValue("demo");
    getAgentLiveContext.mockResolvedValue("live");
    const ports = createLegacyRealtimeSessionAdapter();

    await expect(ports.history.load("meeting-1", 8)).resolves.toBe("history");
    expect(ports.context.demo("report")).toBe("demo");
    await expect(ports.context.live("report")).resolves.toBe("live");
    expect(getRecentHistory).toHaveBeenCalledWith("meeting-1", 8);
    expect(getAgentDemoContext).toHaveBeenCalledWith("report");
    expect(getAgentLiveContext).toHaveBeenCalledWith("report");
  });

  it("passes the realtime token config through unchanged", async () => {
    const session = { token: "secret", expiresAt: 1, model: "gpt-realtime-2.1" };
    mintRealtimeSession.mockResolvedValue(session);
    const ports = createLegacyRealtimeSessionAdapter();
    const input = {
      agentName: "Ivy 艾薇",
      role: "數據參謀",
      description: "desc",
      voice: "coral",
      isTeamLead: false,
      history: "history",
      liveContext: "live",
    };

    await expect(ports.provider.mint(input)).resolves.toBe(session);
    expect(mintRealtimeSession).toHaveBeenCalledWith(input);
  });
});
