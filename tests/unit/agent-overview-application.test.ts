import { describe, expect, it, vi } from "vitest";
import { runAgentOverview } from "@/modules/agents/overview-read-application";

describe("runAgentOverview", () => {
  it("returns provider data and forwards the optional days value", async () => {
    const read = vi.fn().mockResolvedValue({ total: 3 });
    await expect(runAgentOverview({ read }, 14)).resolves.toEqual({ kind: "success", data: { total: 3 } });
    expect(read).toHaveBeenCalledWith(14);
  });

  it("maps provider failures to the existing read error message", async () => {
    const read = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    await expect(runAgentOverview({ read })).resolves.toEqual({ kind: "error", message: "provider unavailable" });
  });

  it("keeps the fallback for non-Error failures", async () => {
    const read = vi.fn().mockRejectedValue("offline");
    await expect(runAgentOverview({ read })).resolves.toEqual({ kind: "error", message: "讀取失敗" });
  });
});
