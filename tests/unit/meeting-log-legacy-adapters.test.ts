import { beforeEach, describe, expect, it, vi } from "vitest";

const { logRealtimeUsage } = vi.hoisted(() => ({
  logRealtimeUsage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai-usage", () => ({ logRealtimeUsage }));

import { createLegacyMeetingRealtimeUsageAdapter } from "@/adapters/meeting/legacy-log-usage-adapter";

beforeEach(() => vi.clearAllMocks());

describe("Meeting realtime usage adapter", () => {
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
