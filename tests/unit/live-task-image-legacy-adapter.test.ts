import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLiveImage } = vi.hoisted(() => ({ getLiveImage: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/live-task-store", () => ({ getLiveImage }));

import { createLegacyLiveTaskImageAdapter } from "@/adapters/live-task/legacy-image-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Live Task image adapter", () => {
  it("passes the agent slug to the existing image reader", async () => {
    getLiveImage.mockResolvedValue("data:image/jpeg;base64,abc");
    const adapter = createLegacyLiveTaskImageAdapter();

    await expect(adapter.getImage("visit")).resolves.toBe("data:image/jpeg;base64,abc");
    expect(getLiveImage).toHaveBeenCalledWith("visit");
  });
});
