import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLiveTaskState, currentStep, setLiveTask, getLiveImage } = vi.hoisted(() => ({
  getLiveTaskState: vi.fn(),
  currentStep: vi.fn(),
  setLiveTask: vi.fn(),
  getLiveImage: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/live-task-store", () => ({ getLiveTaskState, setLiveTask, getLiveImage }));
vi.mock("@/lib/agent-runs", () => ({ currentStep }));

import { createLiveTaskStateRepository } from "@/adapters/live-task/live-task-state-repository";

beforeEach(() => vi.clearAllMocks());

describe("Live task state repository", () => {
  it("keeps state and current-step reader arguments", async () => {
    const state = { step: 1, status: "active", caption: null, hasImage: false, imageVersion: 0, updatedAt: 1700000000000 };
    const step = { runId: "run-1", nodeId: "scan", status: "active", outputSummary: null, startedAt: "2023-11-14T22:13:20.000Z" };
    getLiveTaskState.mockResolvedValue(state);
    currentStep.mockResolvedValue(step);
    const repository = createLiveTaskStateRepository();

    await expect(repository.getTaskState("visit")).resolves.toEqual(state);
    await expect(repository.getCurrentStep("visit")).resolves.toEqual(step);
    expect(getLiveTaskState).toHaveBeenCalledWith("visit");
    expect(currentStep).toHaveBeenCalledWith("visit");
  });

  it("keeps state writer arguments for both route and cron consumers", async () => {
    setLiveTask.mockResolvedValue(undefined);
    const patch = { step: 2, status: "active" as const, caption: "處理中" };

    await expect(createLiveTaskStateRepository().setState("visit", patch)).resolves.toBeUndefined();
    expect(setLiveTask).toHaveBeenCalledWith("visit", patch);
  });

  it("keeps the image reader agent slug", async () => {
    getLiveImage.mockResolvedValue("data:image/jpeg;base64,abc");
    await expect(createLiveTaskStateRepository().getImage("visit")).resolves.toBe("data:image/jpeg;base64,abc");
    expect(getLiveImage).toHaveBeenCalledWith("visit");
  });
});
