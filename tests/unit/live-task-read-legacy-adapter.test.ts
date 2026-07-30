import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLiveTaskState, currentStep } = vi.hoisted(() => ({
  getLiveTaskState: vi.fn(),
  currentStep: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/live-task-store", () => ({ getLiveTaskState }));
vi.mock("@/lib/agent-runs", () => ({ currentStep }));

import { createLegacyLiveTaskReadAdapter } from "@/adapters/live-task/legacy-read-adapter";

beforeEach(() => vi.clearAllMocks());

describe("legacy Live Task read adapter", () => {
  it("keeps the existing state and run-step readers", async () => {
    const state = { step: 1, status: "active", caption: null, hasImage: false, imageVersion: 0, updatedAt: 1700000000000 };
    const step = { runId: "run-1", nodeId: "scan", status: "active", outputSummary: null, startedAt: "2023-11-14T22:13:20.000Z" };
    getLiveTaskState.mockResolvedValue(state);
    currentStep.mockResolvedValue(step);
    const adapter = createLegacyLiveTaskReadAdapter();

    await expect(adapter.getTaskState("visit")).resolves.toEqual(state);
    await expect(adapter.getCurrentStep("visit")).resolves.toEqual(step);
    expect(getLiveTaskState).toHaveBeenCalledWith("visit");
    expect(currentStep).toHaveBeenCalledWith("visit");
  });
});
