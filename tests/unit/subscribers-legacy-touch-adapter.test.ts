import { describe, expect, it, vi } from "vitest";

const touchSubscriber = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/subscribers", () => ({ touchSubscriber }));

import { createLegacySubscriberTouchAdapter } from "@/adapters/subscribers/legacy-touch-adapter";

describe("legacy subscriber touch adapter", () => {
  it("keeps the existing channel-aware subscriber touch binding", async () => {
    const adapter = createLegacySubscriberTouchAdapter();

    await adapter.touch("line-user-1", "primary");
    await adapter.touch("line-user-2", "support");

    expect(touchSubscriber).toHaveBeenNthCalledWith(1, "line-user-1", "primary");
    expect(touchSubscriber).toHaveBeenNthCalledWith(2, "line-user-2", "support");
  });
});
