import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { buildPushMessages, logAiUsage, pushLineRawMessages } = vi.hoisted(() => ({
  buildPushMessages: vi.fn(),
  logAiUsage: vi.fn(),
  pushLineRawMessages: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai-usage", () => ({ logAiUsage }));
vi.mock("@/lib/line", () => ({ pushLineRawMessages }));
vi.mock("@/lib/line-message-styles", () => ({ buildPushMessages }));

import { createLineDailyReportDelivery } from "@/adapters/reporting/line-daily-report-delivery";
import { createOpenAiDailyReportSummaryProvider } from "@/adapters/reporting/openai-daily-report-summary-provider";
import { createSupabaseTeamLeadReportRepository } from "@/adapters/reporting/supabase-team-lead-report-repository";
import { createSupabaseSupportReportRepository } from "@/adapters/support/supabase-support-report-repository";
import { TEAM_LEAD_REPORT_SUMMARY_CONFIG } from "@/modules/reporting/team-lead";
import { SUPPORT_REPORT_SUMMARY_CONFIG } from "@/modules/support/report";

const originalOpenAiKey = process.env.OPENAI_API_KEY;

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

describe("Daily report external boundaries", () => {
  it("keeps Team Lead's existing config, activity window, and activity write mapping", async () => {
    const configQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { enabled: true, settings: { reportTo: "U123" } } }),
    };
    configQuery.select.mockReturnValue(configQuery);
    configQuery.eq.mockReturnValue(configQuery);
    const activitiesQuery = {
      select: vi.fn(),
      gte: vi.fn(),
      neq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({
        data: [
          { agent_slug: "visit", occurred_at: "2026-07-31T00:00:00.000Z", summary: "done", status: "success" },
        ],
      }),
    };
    activitiesQuery.select.mockReturnValue(activitiesQuery);
    activitiesQuery.gte.mockReturnValue(activitiesQuery);
    activitiesQuery.neq.mockReturnValue(activitiesQuery);
    activitiesQuery.order.mockReturnValue(activitiesQuery);
    const activityWrite = { insert: vi.fn().mockResolvedValue({ error: null }) };
    let activityTableCalls = 0;
    const from = vi.fn((table: string) => {
      if (table === "line_agents") return configQuery;
      if (table === "line_agent_activity") {
        activityTableCalls += 1;
        return activityTableCalls === 1 ? activitiesQuery : activityWrite;
      }
      throw new Error(`unexpected table: ${table}`);
    });
    const repository = createSupabaseTeamLeadReportRepository({ from } as never);

    await expect(repository.getAgentConfig()).resolves.toEqual({ enabled: true, settings: { reportTo: "U123" } });
    await expect(repository.listActivities("2026-07-30T00:00:00.000Z")).resolves.toEqual([
      { agent_slug: "visit", occurred_at: "2026-07-31T00:00:00.000Z", summary: "done", status: "success" },
    ]);
    await repository.recordActivity({ summary: "sent", status: "success" });

    expect(configQuery.select).toHaveBeenCalledWith("enabled, settings");
    expect(configQuery.eq).toHaveBeenCalledWith("slug", "teamlead");
    expect(activitiesQuery.gte).toHaveBeenCalledWith("occurred_at", "2026-07-30T00:00:00.000Z");
    expect(activitiesQuery.neq).toHaveBeenCalledWith("agent_slug", "teamlead");
    expect(activitiesQuery.order).toHaveBeenCalledWith("occurred_at", { ascending: false });
    expect(activitiesQuery.limit).toHaveBeenCalledWith(200);
    expect(activityWrite.insert).toHaveBeenCalledWith({
      agent_slug: "teamlead",
      summary: "sent",
      status: "success",
    });
  });

  it("keeps Support's conversation, subscriber, and activity mappings", async () => {
    const configQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: { enabled: true, settings: { reportTo: "U123" } } }),
    };
    configQuery.select.mockReturnValue(configQuery);
    configQuery.eq.mockReturnValue(configQuery);
    const messagesQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({
        data: [{ line_user_id: "U1", text: "hello", occurred_at: "2026-07-31T00:00:00.000Z" }],
      }),
    };
    messagesQuery.select.mockReturnValue(messagesQuery);
    messagesQuery.eq.mockReturnValue(messagesQuery);
    messagesQuery.gte.mockReturnValue(messagesQuery);
    messagesQuery.order.mockReturnValue(messagesQuery);
    const subscribersQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn().mockResolvedValue({ data: [{ line_user_id: "U1", display_name: "王小明" }] }),
    };
    subscribersQuery.select.mockReturnValue(subscribersQuery);
    subscribersQuery.eq.mockReturnValue(subscribersQuery);
    const activityWrite = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const from = vi.fn((table: string) => {
      if (table === "line_agents") return configQuery;
      if (table === "line_support_conversations") return messagesQuery;
      if (table === "line_subscribers") return subscribersQuery;
      if (table === "line_agent_activity") return activityWrite;
      throw new Error(`unexpected table: ${table}`);
    });
    const repository = createSupabaseSupportReportRepository({ from } as never);

    await expect(repository.getAgentConfig()).resolves.toEqual({ enabled: true, settings: { reportTo: "U123" } });
    await expect(repository.listCustomerMessages("2026-07-30T00:00:00.000Z")).resolves.toEqual([
      { line_user_id: "U1", text: "hello", occurred_at: "2026-07-31T00:00:00.000Z" },
    ]);
    await expect(repository.getDisplayNames(["U1"])).resolves.toEqual(new Map([["U1", "王小明"]]));
    await repository.recordActivity({ summary: "sent", status: "success" });

    expect(messagesQuery.eq).toHaveBeenCalledWith("role", "customer");
    expect(messagesQuery.gte).toHaveBeenCalledWith("occurred_at", "2026-07-30T00:00:00.000Z");
    expect(messagesQuery.order).toHaveBeenCalledWith("occurred_at", { ascending: true });
    expect(messagesQuery.limit).toHaveBeenCalledWith(500);
    expect(subscribersQuery.eq).toHaveBeenCalledWith("channel", "support");
    expect(subscribersQuery.in).toHaveBeenCalledWith("line_user_id", ["U1"]);
    expect(activityWrite.insert).toHaveBeenCalledWith({
      agent_slug: "support",
      summary: "sent",
      status: "success",
    });
  });

  it("shares the same OpenAI summary protocol while retaining each domain's prompt and usage identity", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ usage: { total_tokens: 4 }, choices: [{ message: { content: "AI 摘要" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const teamLeadProvider = createOpenAiDailyReportSummaryProvider(TEAM_LEAD_REPORT_SUMMARY_CONFIG);
    const supportProvider = createOpenAiDailyReportSummaryProvider(SUPPORT_REPORT_SUMMARY_CONFIG);

    await expect(teamLeadProvider.summarize("team brief")).resolves.toBe("AI 摘要");
    await expect(supportProvider.summarize("support brief")).resolves.toBe("AI 摘要");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(firstBody).toMatchObject({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [{ role: "system", content: TEAM_LEAD_REPORT_SUMMARY_CONFIG.systemPrompt }, { role: "user", content: "team brief" }],
    });
    expect(secondBody.messages[0].content).toBe(SUPPORT_REPORT_SUMMARY_CONFIG.systemPrompt);
    expect(logAiUsage).toHaveBeenNthCalledWith(1, {
      operation: "每日晨報摘要",
      model: "gpt-4o-mini",
      usage: { total_tokens: 4 },
      agentSlug: "teamlead",
    });
    expect(logAiUsage).toHaveBeenNthCalledWith(2, {
      operation: "客服每日彙報摘要",
      model: "gpt-4o-mini",
      usage: { total_tokens: 4 },
      agentSlug: "support",
    });
  });

  it("uses one LINE delivery adapter without changing the renderer payload", async () => {
    buildPushMessages.mockReturnValue([{ type: "text", text: "demo" }]);
    pushLineRawMessages.mockResolvedValue(undefined);
    const delivery = createLineDailyReportDelivery();

    await delivery.deliver({
      recipient: "U123",
      style: "buttons",
      text: "demo",
      title: "每日彙報",
      accentColor: "#475569",
    });

    expect(buildPushMessages).toHaveBeenCalledWith({
      style: "buttons",
      text: "demo",
      title: "每日彙報",
      accentColor: "#475569",
    });
    expect(pushLineRawMessages).toHaveBeenCalledWith("U123", [{ type: "text", text: "demo" }]);
  });
});
