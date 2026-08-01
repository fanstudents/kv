import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createRealtimeClientSecret, getAgentDemoContext, getAgentLiveContext, logRealtimeUsage } = vi.hoisted(() => ({
  createRealtimeClientSecret: vi.fn(),
  getAgentDemoContext: vi.fn(),
  getAgentLiveContext: vi.fn(),
  logRealtimeUsage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/meeting-demo-context", () => ({ getAgentDemoContext }));
vi.mock("@/lib/meeting-context", () => ({ getAgentLiveContext }));
vi.mock("@/lib/ai-usage", () => ({ logRealtimeUsage }));
vi.mock("@/adapters/openai/client", () => ({ createRealtimeClientSecret }));

import { createMeetingRealtimeContextProvider } from "@/adapters/meeting/meeting-realtime-context-provider";
import { createMeetingRealtimeUsageRepository } from "@/adapters/meeting/meeting-realtime-usage-repository";
import { createOpenAiMeetingRealtimeProvider } from "@/adapters/meeting/openai-meeting-realtime-provider";
import { POST as logUsage } from "@/app/api/meeting/log-usage/route";
import { POST as mintSession } from "@/app/api/meeting/realtime-session/route";
import {
  findActiveRealtimeAgent,
  parseMeetingRealtimeUsageLogRequest,
  parseRealtimeSessionRequest,
  runMeetingRealtimeUsageLog,
  runRealtimeSession,
  toRealtimeAgentProfile,
  type MeetingRealtimeUsageRepository,
  type RealtimeAgentProfile,
  type RealtimeCatalogAgent,
  type RealtimeSessionDependencies,
} from "@/modules/meeting/realtime";

const agents: RealtimeCatalogAgent[] = [
  {
    slug: "teamlead",
    personEn: "Vivian",
    personZh: "薇薇安",
    role: "Team Lead 大總管",
    description: "lead",
    status: "active",
  },
  {
    slug: "report",
    personEn: "Ivy",
    personZh: "艾薇",
    role: "數據參謀",
    description: "report",
    status: "active",
  },
  {
    slug: "paused",
    personEn: "Pause",
    personZh: "暫停",
    role: "暫停",
    description: "paused",
    status: "paused",
  },
];

const profile: RealtimeAgentProfile = {
  slug: "report",
  name: "Ivy 艾薇",
  role: "數據參謀",
  description: "report",
  isTeamLead: false,
};

function createSessionDependencies(): RealtimeSessionDependencies {
  return {
    meetingSessions: { getHistory: vi.fn(async () => "history") },
    context: {
      demo: vi.fn(() => "demo"),
      live: vi.fn(async () => "live"),
    },
    provider: { mint: vi.fn(async () => ({ token: "session" })) },
  };
}

function createUsageRepository(): MeetingRealtimeUsageRepository {
  return { record: vi.fn(async () => undefined) };
}

beforeEach(() => vi.clearAllMocks());

describe("Meeting realtime request and roster rules", () => {
  it("preserves string fields, the exact demo flag, and existing defaults", () => {
    expect(
      parseRealtimeSessionRequest({ slug: "report", meetingId: "m-1", voice: "coral", demo: true })
    ).toEqual({ slug: "report", meetingId: "m-1", voice: "coral", demo: true });
    expect(parseRealtimeSessionRequest({ slug: "report", demo: 1 }).demo).toBe(false);
    expect(parseRealtimeSessionRequest(null)).toEqual({
      slug: "",
      meetingId: "",
      voice: "alloy",
      demo: false,
    });
    expect(parseRealtimeSessionRequest({ slug: 1, meetingId: 2, voice: null })).toEqual({
      slug: "",
      meetingId: "",
      voice: "alloy",
      demo: false,
    });
  });

  it("requires an active Agent and maps its existing display fields", () => {
    expect(findActiveRealtimeAgent(agents, "report")).toBe(agents[1]);
    expect(findActiveRealtimeAgent(agents, "paused")).toBeNull();
    expect(findActiveRealtimeAgent(agents, "missing")).toBeNull();
    expect(toRealtimeAgentProfile(agents[0])).toEqual({
      slug: "teamlead",
      name: "Vivian 薇薇安",
      role: "Team Lead 大總管",
      description: "lead",
      isTeamLead: true,
    });
  });

  it("preserves realtime usage defaults and JSON-shaped usage payloads", () => {
    const usage = { total_tokens: 4, input_token_details: { text_tokens: 3 } };
    expect(
      parseMeetingRealtimeUsageLogRequest({ model: "gpt-realtime-2.1", agentSlug: "report", usage })
    ).toEqual({ model: "gpt-realtime-2.1", agentSlug: "report", usage });
    expect(parseMeetingRealtimeUsageLogRequest(null)).toEqual({
      model: "",
      agentSlug: undefined,
      usage: {},
    });
    const legacyUsage = ["legacy", 1];
    expect(parseMeetingRealtimeUsageLogRequest({ model: "model", usage: legacyUsage }).usage).toBe(legacyUsage);
  });
});

describe("Meeting realtime session", () => {
  it("returns a stable missing-agent result without touching dependencies", async () => {
    const dependencies = createSessionDependencies();

    await expect(
      runRealtimeSession(
        { slug: "missing", meetingId: "meeting-1", voice: "alloy", demo: false },
        null,
        dependencies
      )
    ).resolves.toEqual({ kind: "agent-not-found" });
    expect(dependencies.meetingSessions.getHistory).not.toHaveBeenCalled();
    expect(dependencies.context.live).not.toHaveBeenCalled();
    expect(dependencies.provider.mint).not.toHaveBeenCalled();
  });

  it("passes the existing profile, history, and demo context to the provider", async () => {
    const dependencies = createSessionDependencies();
    const session = { token: "session", expiresAt: 1 };
    vi.mocked(dependencies.provider.mint).mockResolvedValue(session);

    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "meeting-1", voice: "coral", demo: true },
        profile,
        dependencies
      )
    ).resolves.toEqual({ kind: "ok", session });
    expect(dependencies.meetingSessions.getHistory).toHaveBeenCalledWith("meeting-1", 8);
    expect(dependencies.context.demo).toHaveBeenCalledWith("report");
    expect(dependencies.context.live).not.toHaveBeenCalled();
    expect(dependencies.provider.mint).toHaveBeenCalledWith({
      agentName: "Ivy 艾薇",
      role: "數據參謀",
      description: "report",
      voice: "coral",
      isTeamLead: false,
      history: "history",
      liveContext: "demo",
    });
  });

  it("does not load empty history and tolerates history or live-context failures", async () => {
    const withoutMeetingId = createSessionDependencies();
    vi.mocked(withoutMeetingId.context.live).mockRejectedValue(new Error("context down"));

    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "", voice: "alloy", demo: false },
        profile,
        withoutMeetingId
      )
    ).resolves.toEqual({ kind: "ok", session: { token: "session" } });
    expect(withoutMeetingId.meetingSessions.getHistory).not.toHaveBeenCalled();
    expect(withoutMeetingId.provider.mint).toHaveBeenCalledWith(
      expect.objectContaining({ history: "", liveContext: "" })
    );

    const withoutHistory = createSessionDependencies();
    vi.mocked(withoutHistory.meetingSessions.getHistory).mockRejectedValue(new Error("history down"));
    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "meeting-1", voice: "alloy", demo: false },
        profile,
        withoutHistory
      )
    ).resolves.toEqual({ kind: "ok", session: { token: "session" } });
    expect(withoutHistory.provider.mint).toHaveBeenCalledWith(
      expect.objectContaining({ history: "", liveContext: "live" })
    );
  });

  it("maps provider errors while preserving the existing message rules", async () => {
    const dependencies = createSessionDependencies();
    vi.mocked(dependencies.provider.mint).mockRejectedValueOnce(new Error("provider down"));

    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "", voice: "alloy", demo: false },
        profile,
        dependencies
      )
    ).resolves.toEqual({ kind: "mint-failed", message: "provider down" });

    vi.mocked(dependencies.provider.mint).mockRejectedValueOnce("failed");
    await expect(
      runRealtimeSession(
        { slug: "report", meetingId: "", voice: "alloy", demo: false },
        profile,
        dependencies
      )
    ).resolves.toEqual({ kind: "mint-failed", message: "無法建立即時語音連線" });
  });
});

describe("Meeting realtime usage logging", () => {
  it("returns the established invalid result before usage recording", async () => {
    const repository = createUsageRepository();

    await expect(
      runMeetingRealtimeUsageLog({ model: "", agentSlug: undefined, usage: {} }, repository)
    ).resolves.toMatchObject({ kind: "invalid" });
    expect(repository.record).not.toHaveBeenCalled();
  });

  it("passes the complete usage request through unchanged and keeps failures uncaught", async () => {
    const repository = createUsageRepository();
    const input = { model: "gpt-realtime-2.1", agentSlug: "report", usage: { total_tokens: 4 } };

    await expect(runMeetingRealtimeUsageLog(input, repository)).resolves.toEqual({ kind: "ok" });
    expect(repository.record).toHaveBeenCalledWith(input);

    vi.mocked(repository.record).mockRejectedValueOnce(new Error("unexpected"));
    await expect(
      runMeetingRealtimeUsageLog({ model: "model", agentSlug: undefined, usage: {} }, repository)
    ).rejects.toThrow("unexpected");
  });
});

describe("Meeting realtime external boundaries", () => {
  it("forwards demo/live context through the context provider", async () => {
    getAgentDemoContext.mockReturnValue("demo");
    getAgentLiveContext.mockResolvedValue("live");
    const provider = createMeetingRealtimeContextProvider();

    expect(provider.demo("report")).toBe("demo");
    await expect(provider.live("report")).resolves.toBe("live");
    expect(getAgentDemoContext).toHaveBeenCalledWith("report");
    expect(getAgentLiveContext).toHaveBeenCalledWith("report");
  });

  it("forwards the realtime token config through the OpenAI provider", async () => {
    const session = { token: "secret", expiresAt: 1, model: "gpt-realtime-2.1" };
    createRealtimeClientSecret.mockResolvedValue({ value: "secret", expiresAt: 1 });
    const provider = createOpenAiMeetingRealtimeProvider();
    const input = {
      agentName: "Ivy 艾薇",
      role: "數據參謀",
      description: "desc",
      voice: "coral",
      isTeamLead: false,
      history: "history",
      liveContext: "live",
    };

    await expect(provider.mint(input)).resolves.toEqual(session);
    expect(createRealtimeClientSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "realtime",
        model: "gpt-realtime-2.1",
        audio: expect.objectContaining({
          input: expect.objectContaining({
            transcription: { model: "whisper-1" },
            turn_detection: { type: "semantic_vad", eagerness: "high" },
          }),
          output: { voice: "coral" },
        }),
        tool_choice: "auto",
      })
    );
  });

  it("forwards the current usage payload to the usage repository", async () => {
    const repository = createMeetingRealtimeUsageRepository();
    const usage = { total_tokens: 12, input_token_details: { text_tokens: 8 } };
    logRealtimeUsage.mockResolvedValue(undefined);

    await expect(
      repository.record({ model: "gpt-realtime-2.1", agentSlug: "report", usage })
    ).resolves.toBeUndefined();
    expect(logRealtimeUsage).toHaveBeenCalledWith({
      agentSlug: "report",
      model: "gpt-realtime-2.1",
      usage,
    });
  });
});

describe("Meeting realtime route contracts", () => {
  it("keeps the not-found and invalid-input status boundaries", async () => {
    const missingAgent = await mintSession(
      new NextRequest("http://localhost/api/meeting/realtime-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "missing" }),
      })
    );
    expect(missingAgent.status).toBe(404);
    await expect(missingAgent.json()).resolves.toEqual({ error: "找不到這位 Agent" });

    const invalidUsage = await logUsage(
      new NextRequest("http://localhost/api/meeting/log-usage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      })
    );
    expect(invalidUsage.status).toBe(400);
    await expect(invalidUsage.json()).resolves.toEqual({ error: "缺少 model" });
  });

  it("keeps the realtime provider failure and successful usage response shapes", async () => {
    getAgentDemoContext.mockReturnValue("demo");
    createRealtimeClientSecret.mockRejectedValueOnce(new Error("provider down"));
    const failedSession = await mintSession(
      new NextRequest("http://localhost/api/meeting/realtime-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "teamlead", demo: true }),
      })
    );
    expect(failedSession.status).toBe(502);
    await expect(failedSession.json()).resolves.toEqual({ error: "provider down" });

    logRealtimeUsage.mockResolvedValueOnce(undefined);
    const acceptedUsage = await logUsage(
      new NextRequest("http://localhost/api/meeting/log-usage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-realtime-2.1", usage: { total_tokens: 1 } }),
      })
    );
    expect(acceptedUsage.status).toBe(200);
    await expect(acceptedUsage.json()).resolves.toEqual({ ok: true });
  });
});
