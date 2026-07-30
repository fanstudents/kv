import { describe, expect, it, vi } from "vitest";
import { runLiveTaskUpdate } from "@/modules/live-task/update-application";

describe("Live Task update application", () => {
  it("rejects a missing agent before state storage", async () => {
    const port = { setState: vi.fn() };

    await expect(
      runLiveTaskUpdate({ agentSlug: "", patch: { step: 0, status: "active" } }, port),
    ).resolves.toEqual({ kind: "invalid", message: "missing agent" });
    expect(port.setState).not.toHaveBeenCalled();
  });

  it("passes the patch unchanged and returns ok", async () => {
    const port = { setState: vi.fn().mockResolvedValue(undefined) };
    const patch = { step: 4, status: "done" as const, caption: "完成", image: "data:image/png;base64,AAEC" };

    await expect(runLiveTaskUpdate({ agentSlug: "visit", patch }, port)).resolves.toEqual({ kind: "ok" });
    expect(port.setState).toHaveBeenCalledWith("visit", patch);
  });
});
