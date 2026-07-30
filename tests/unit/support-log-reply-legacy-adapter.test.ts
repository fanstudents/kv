import { beforeEach, describe, expect, it, vi } from "vitest";

const { logConversationMessage } = vi.hoisted(() => ({ logConversationMessage: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/support-conversations", () => ({ logConversationMessage }));

import { createLegacySupportLogReplyAdapter } from "@/adapters/support/legacy-log-reply-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Support log-reply adapter", () => {
  it("keeps the bot role and conversation payload", async () => {
    logConversationMessage.mockResolvedValue(undefined);
    const adapter = createLegacySupportLogReplyAdapter();

    await expect(adapter.logBotReply("U123", "已收到")).resolves.toBeUndefined();
    expect(logConversationMessage).toHaveBeenCalledWith("U123", "bot", "已收到");
  });
});
