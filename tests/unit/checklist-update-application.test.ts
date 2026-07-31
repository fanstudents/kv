import { describe, expect, it } from "vitest";
import { runChecklistUpdate } from "@/modules/checklist/update-application";

describe("runChecklistUpdate", () => {
  const input = { itemId: "item-1", done: true };
  const now = new Date("2026-07-31T00:00:00.000Z");

  it("passes a deterministic timestamp and returns the row", async () => {
    const upsert = async (payload: { itemId: string; done: boolean; updatedAt: string }) => ({
      data: payload,
      error: null,
    });
    await expect(runChecklistUpdate(input, { upsert }, now)).resolves.toEqual({
      kind: "ok",
      data: { itemId: "item-1", done: true, updatedAt: now.toISOString() },
    });
  });

  it("maps provider errors without changing the HTTP boundary", async () => {
    await expect(
      runChecklistUpdate(input, { upsert: async () => ({ data: null, error: { message: "write failed" } }) }, now),
    ).resolves.toEqual({ kind: "error", message: "write failed" });
  });
});
