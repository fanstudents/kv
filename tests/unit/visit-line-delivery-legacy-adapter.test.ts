import { describe, expect, it, vi } from "vitest";

const { replyLineMessage, replyLineRawMessages } = vi.hoisted(() => ({
  replyLineMessage: vi.fn(),
  replyLineRawMessages: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/line", () => ({ replyLineMessage, replyLineRawMessages }));

import { createLegacyVisitLineDeliveryAdapter } from "@/adapters/visit/legacy-line-delivery-adapter";

describe("legacy Visit LINE delivery adapter", () => {
  it("keeps text and raw-message reply bindings", async () => {
    const adapter = createLegacyVisitLineDeliveryAdapter();
    const messages = [{ type: "text", text: "hello" }];

    await adapter.replyText("reply-1", "hello");
    await adapter.replyMessages("reply-2", messages);

    expect(replyLineMessage).toHaveBeenCalledWith("reply-1", "hello");
    expect(replyLineRawMessages).toHaveBeenCalledWith("reply-2", messages);
  });
});
