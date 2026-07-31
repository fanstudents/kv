import { describe, expect, it, vi } from "vitest";
import { runActivityRead } from "@/modules/activity/read-application";

describe("activity read application", () => {
  it("maps a legacy query error to the existing error result", async () => {
    const port = {
      list: vi.fn().mockResolvedValue({ data: null, error: { message: "database down" } }),
    };

    await expect(runActivityRead({ agentSlug: null, status: "failed", limit: 25 }, port)).resolves.toEqual({
      kind: "error",
      message: "database down",
    });
  });

  it("returns the raw activity data unchanged", async () => {
    const rows = [{ id: "a1", status: "ok" }];
    const port = { list: vi.fn().mockResolvedValue({ data: rows, error: null }) };

    await expect(runActivityRead({ agentSlug: null, status: null, limit: 200 }, port)).resolves.toEqual({ kind: "ok", data: rows });
    expect(port.list).toHaveBeenCalledWith(null, 200, null);
  });
});
