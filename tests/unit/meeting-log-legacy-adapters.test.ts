import { beforeEach, describe, expect, it, vi } from "vitest";

const { appendTurns, logRealtimeUsage } = vi.hoisted(() => ({
  appendTurns: vi.fn(),
  logRealtimeUsage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/meeting-store", () => ({ appendTurns }));
vi.mock("@/lib/ai-usage", () => ({ logRealtimeUsage }));

import { createLegacyMeetingTurnLogAdapter } from "@/adapters/meeting/legacy-log-turn-adapter";
import { createLegacyMeetingRealtimeUsageAdapter } from "@/adapters/meeting/legacy-log-usage-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Meeting log-turn adapter", () => {
  it("preserves the single-turn append shape and optional fields", async () => {
    const adapter = createLegacyMeetingTurnLogAdapter();
    const input = {
      meetingId: "meeting-1",
      role: "agent" as const,
      content: "已完成",
      agentSlug: "report",
      speaker: "Ivy 艾薇",
    };
    appendTurns.mockResolvedValue(undefined);

    await expect(adapter.append(input)).resolves.toBeUndefined();
    expect(appendTurns).toHaveBeenCalledWith("meeting-1", [
      {
        role: "agent",
        agentSlug: "report",
        speaker: "Ivy 艾薇",
        content: "已完成",
      },
    ]);
  });
});

describe("legacy Meeting log-usage adapter", () => {
  it("passes the current realtime usage payload through unchanged", async () => {
    const adapter = createLegacyMeetingRealtimeUsageAdapter();
    const usage = { total_tokens: 12, input_token_details: { text_tokens: 8 } };
    logRealtimeUsage.mockResolvedValue(undefined);

    await expect(
      adapter.record({ model: "gpt-realtime-2.1", agentSlug: "report", usage })
    ).resolves.toBeUndefined();
    expect(logRealtimeUsage).toHaveBeenCalledWith({
      agentSlug: "report",
      model: "gpt-realtime-2.1",
      usage,
    });
  });
});
