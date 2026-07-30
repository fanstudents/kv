import { beforeEach, describe, expect, it, vi } from "vitest";

const { setLiveTask } = vi.hoisted(() => ({ setLiveTask: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/live-task-store", () => ({ setLiveTask }));

import { createLegacyLiveTaskUpdateAdapter } from "@/adapters/live-task/legacy-update-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Live Task update adapter", () => {
  it("keeps the existing state-store arguments", async () => {
    setLiveTask.mockResolvedValue(undefined);
    const adapter = createLegacyLiveTaskUpdateAdapter();
    const patch = { step: 2, status: "active" as const, caption: "處理中" };

    await expect(adapter.setState("visit", patch)).resolves.toBeUndefined();
    expect(setLiveTask).toHaveBeenCalledWith("visit", patch);
  });
});
