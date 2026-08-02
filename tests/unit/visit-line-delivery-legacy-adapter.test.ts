import { describe, expect, it, vi } from "vitest";

const { pushLineMessage, replyLineMessage, replyLineRawMessages } = vi.hoisted(() => ({
  pushLineMessage: vi.fn(),
  replyLineMessage: vi.fn(),
  replyLineRawMessages: vi.fn(),
}));

vi.mock("@/lib/line", () => ({ pushLineMessage, replyLineMessage, replyLineRawMessages }));

import { createLegacyVisitLineDeliveryAdapter } from "@/adapters/visit/legacy-line-adapters";

describe("legacy Visit LINE delivery adapter", () => {
  it("keeps text and raw-message reply bindings", async () => {
    const adapter = createLegacyVisitLineDeliveryAdapter();
    const messages = [{ type: "text", text: "hello" }];

    await adapter.replyText("reply-1", "hello");
    await adapter.replyMessages("reply-2", messages);
    await adapter.pushText("line-1", "push hello");

    expect(replyLineMessage).toHaveBeenCalledWith("reply-1", "hello");
    expect(replyLineRawMessages).toHaveBeenCalledWith("reply-2", messages);
    expect(pushLineMessage).toHaveBeenCalledWith("line-1", "push hello");
  });
});
