import { describe, expect, it, vi } from "vitest";
import { runLiveTaskRead } from "@/modules/live-task/read-application";

describe("Live Task read application", () => {
  it("returns inactive when both legacy sources are empty", async () => {
    const port = {
      getTaskState: vi.fn().mockResolvedValue(null),
      getCurrentStep: vi.fn().mockResolvedValue(null),
    };

    await expect(runLiveTaskRead({ agentSlug: "visit" }, port)).resolves.toEqual({ kind: "inactive" });
    expect(port.getTaskState).toHaveBeenCalledWith("visit");
    expect(port.getCurrentStep).toHaveBeenCalledWith("visit");
  });

  it("keeps step data precedence while retaining task image metadata", async () => {
    const port = {
      getTaskState: vi.fn().mockResolvedValue({
        step: 2,
        status: "active",
        caption: "暫存 caption",
        hasImage: true,
        imageVersion: 7,
        updatedAt: 1700000000000,
      }),
      getCurrentStep: vi.fn().mockResolvedValue({
        runId: "run-1",
        nodeId: "confirm",
        status: "waiting",
        outputSummary: "請確認",
        startedAt: "2023-11-14T22:13:20.000Z",
      }),
    };

    await expect(runLiveTaskRead({ agentSlug: "visit" }, port)).resolves.toEqual({
      kind: "active",
      response: {
        active: true,
        nodeId: "confirm",
        runId: "run-1",
        step: 2,
        status: "waiting",
        caption: "請確認",
        hasImage: true,
        imageVersion: 7,
        updatedAt: 1700000000000,
      },
    });
  });

  it("falls back to a task-only state and normalizes absent fields", async () => {
    const port = {
      getTaskState: vi.fn().mockResolvedValue({
        step: 0,
        status: "done",
        caption: null,
        hasImage: false,
        imageVersion: 0,
        updatedAt: 1700000000000,
      }),
      getCurrentStep: vi.fn().mockResolvedValue(null),
    };

    await expect(runLiveTaskRead({ agentSlug: "visit" }, port)).resolves.toMatchObject({
      kind: "active",
      response: expect.objectContaining({
        nodeId: null,
        runId: null,
        status: "done",
        caption: null,
      }),
    });
  });
});
