import { beforeEach, describe, expect, it, vi } from "vitest";

const { buildPushMessages, pushLineRawMessages, getMainSupabase } = vi.hoisted(() => ({
  buildPushMessages: vi.fn(),
  pushLineRawMessages: vi.fn(),
  getMainSupabase: vi.fn(),
}));

vi.mock("@/lib/line", () => ({ pushLineRawMessages }));
vi.mock("@/lib/line-message-styles", () => ({ buildPushMessages }));
vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { createLineAgentTestPushAdapter } from "@/adapters/agents/line-agent-test-push-adapter";

beforeEach(() => vi.clearAllMocks());

describe("LINE agent test-push adapter", () => {
  it("keeps message construction, channel routing, and activity persistence", async () => {
    buildPushMessages.mockReturnValue([{ type: "text", text: "hello" }]);
    pushLineRawMessages.mockResolvedValue(undefined);
    const failureQuery = { insert: vi.fn(async () => ({ error: null })) };
    const successQuery = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(async () => ({ data: { id: "activity-1" }, error: null })),
    };
    successQuery.insert.mockReturnValue(successQuery);
    successQuery.select.mockReturnValue(successQuery);
    const from = vi.fn((table: string) => (table === "line_agent_activity" && from.mock.calls.length === 1 ? failureQuery : successQuery));
    getMainSupabase.mockReturnValue({ from });
    const adapter = createLineAgentTestPushAdapter();

    await adapter.send({ to: "U1", text: "hello", style: "buttons", title: "Title", accentColor: "#06C755", channel: "support" });
    await adapter.recordFailure({ agent_slug: "support", summary: "failed", status: "failed" });
    await expect(adapter.recordSuccess({ agent_slug: "support", summary: "success", status: "success" })).resolves.toEqual({ id: "activity-1" });

    expect(buildPushMessages).toHaveBeenCalledWith({ style: "buttons", text: "hello", title: "Title", accentColor: "#06C755" });
    expect(pushLineRawMessages).toHaveBeenCalledWith("U1", [{ type: "text", text: "hello" }], "support");
    expect(failureQuery.insert).toHaveBeenCalledWith({ agent_slug: "support", summary: "failed", status: "failed" });
    expect(successQuery.insert).toHaveBeenCalledWith({ agent_slug: "support", summary: "success", status: "success" });
  });
});
