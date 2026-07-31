import { describe, expect, it, vi } from "vitest";
import {
  parseLiveTaskImageDataUrl,
  parseLiveTaskImageRequest,
  parseLiveTaskReadRequest,
  parseLiveTaskUpdateRequest,
  readLiveTask,
  readLiveTaskImage,
  updateLiveTask,
} from "@/modules/live-task/state";

describe("Live task state capability", () => {
  it("keeps the read query agent", () => {
    expect(parseLiveTaskReadRequest("visit")).toEqual({ agentSlug: "visit" });
  });

  it("defaults a missing or non-string read agent to empty", () => {
    expect(parseLiveTaskReadRequest(null)).toEqual({ agentSlug: "" });
    expect(parseLiveTaskReadRequest({})).toEqual({ agentSlug: "" });
  });

  it("returns inactive when state and current step are both empty", async () => {
    const repository = { getTaskState: vi.fn(async () => null), getCurrentStep: vi.fn(async () => null) };

    await expect(readLiveTask({ agentSlug: "visit" }, repository)).resolves.toEqual({ kind: "inactive" });
    expect(repository.getTaskState).toHaveBeenCalledWith("visit");
    expect(repository.getCurrentStep).toHaveBeenCalledWith("visit");
  });

  it("keeps current-step precedence with task image metadata", async () => {
    const repository = {
      getTaskState: vi.fn(async () => ({
        step: 2, status: "active" as const, caption: "task caption", hasImage: true, imageVersion: 7, updatedAt: 1700000000000,
      })),
      getCurrentStep: vi.fn(async () => ({
        runId: "run-1", nodeId: "confirm", status: "waiting", outputSummary: "等待確認", startedAt: "2023-11-14T22:13:20.000Z",
      })),
    };

    await expect(readLiveTask({ agentSlug: "visit" }, repository)).resolves.toEqual({
      kind: "active",
      response: {
        active: true, nodeId: "confirm", runId: "run-1", step: 2, status: "waiting", caption: "等待確認",
        hasImage: true, imageVersion: 7, updatedAt: 1700000000000,
      },
    });
  });

  it("falls back to task-only state fields", async () => {
    const repository = {
      getTaskState: vi.fn(async () => ({
        step: 0, status: "done" as const, caption: null, hasImage: false, imageVersion: 0, updatedAt: 1700000000000,
      })),
      getCurrentStep: vi.fn(async () => null),
    };

    await expect(readLiveTask({ agentSlug: "visit" }, repository)).resolves.toMatchObject({
      kind: "active",
      response: { nodeId: null, runId: null, status: "done", caption: null },
    });
  });

  it("keeps update coercion and status vocabulary", () => {
    expect(parseLiveTaskUpdateRequest({
      agent: "visit", step: 3, status: "waiting", caption: "等待回覆", image: "data:image/png;base64,AAEC",
    })).toEqual({
      agentSlug: "visit",
      patch: { step: 3, status: "waiting", caption: "等待回覆", image: "data:image/png;base64,AAEC" },
    });
    expect(parseLiveTaskUpdateRequest({ agent: "visit", status: "other" }).patch.status).toBe("active");
  });

  it("defaults malformed update fields without inventing values", () => {
    expect(parseLiveTaskUpdateRequest(null)).toEqual({
      agentSlug: "",
      patch: { step: 0, status: "active", caption: undefined, image: undefined },
    });
    expect(parseLiveTaskUpdateRequest({ agent: 1, step: "2", caption: 3, image: null })).toEqual({
      agentSlug: "",
      patch: { step: 0, status: "active", caption: undefined, image: undefined },
    });
  });

  it("rejects a missing update agent before storage", async () => {
    const repository = { setState: vi.fn() };
    await expect(updateLiveTask({ agentSlug: "", patch: { step: 0, status: "active" } }, repository)).resolves.toEqual({
      kind: "invalid", message: "missing agent",
    });
    expect(repository.setState).not.toHaveBeenCalled();
  });

  it("passes a valid patch unchanged to state storage", async () => {
    const repository = { setState: vi.fn(async () => undefined) };
    const patch = { step: 4, status: "done" as const, caption: "完成", image: "data:image/png;base64,AAEC" };

    await expect(updateLiveTask({ agentSlug: "visit", patch }, repository)).resolves.toEqual({ kind: "ok" });
    expect(repository.setState).toHaveBeenCalledWith("visit", patch);
  });

  it("keeps image query parsing defaults", () => {
    expect(parseLiveTaskImageRequest("visit")).toEqual({ agentSlug: "visit" });
    expect(parseLiveTaskImageRequest(null)).toEqual({ agentSlug: "" });
  });

  it("parses only the existing base64 data URL shape", () => {
    expect(parseLiveTaskImageDataUrl("data:image/jpeg;base64,abc123")).toEqual({ contentType: "image/jpeg", base64: "abc123" });
    expect(parseLiveTaskImageDataUrl("https://example.test/image")).toBeNull();
    expect(parseLiveTaskImageDataUrl(null)).toBeNull();
  });

  it("maps missing or malformed images to not-found", async () => {
    const repository = { getImage: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce("not-a-data-url") };
    await expect(readLiveTaskImage({ agentSlug: "visit" }, repository)).resolves.toEqual({ kind: "not-found" });
    await expect(readLiveTaskImage({ agentSlug: "visit" }, repository)).resolves.toEqual({ kind: "not-found" });
  });

  it("returns an image descriptor unchanged", async () => {
    const repository = { getImage: vi.fn(async () => "data:image/png;base64,AAEC") };
    await expect(readLiveTaskImage({ agentSlug: "visit" }, repository)).resolves.toEqual({
      kind: "ok", contentType: "image/png", base64: "AAEC",
    });
    expect(repository.getImage).toHaveBeenCalledWith("visit");
  });
});
