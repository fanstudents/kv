import { describe, expect, it } from "vitest";
import { runChecklistRead } from "@/modules/checklist/read-application";

describe("runChecklistRead", () => {
  it("maps provider errors without changing the HTTP boundary", async () => {
    await expect(
      runChecklistRead({
        list: async () => ({ data: null, error: { message: "query failed" } }),
      }),
    ).resolves.toEqual({ kind: "error", message: "query failed" });
  });

  it("returns checklist rows unchanged", async () => {
    const data = [{ item_id: "a", done: true }, { item_id: "b", done: false }];
    await expect(runChecklistRead({ list: async () => ({ data, error: null }) })).resolves.toEqual({
      kind: "ok",
      data,
    });
  });
});
