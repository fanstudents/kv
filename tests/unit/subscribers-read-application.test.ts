import { describe, expect, it } from "vitest";
import { runSubscribersRead } from "@/modules/subscribers/read-application";

describe("runSubscribersRead", () => {
  it("maps provider errors without changing the HTTP boundary", async () => {
    await expect(
      runSubscribersRead({
        list: async () => ({ data: null, error: { message: "query failed" } }),
      }),
    ).resolves.toEqual({ kind: "error", message: "query failed" });
  });

  it("returns subscriber rows unchanged", async () => {
    const data = [{ id: "s1", tags: ["vip"] }];
    await expect(runSubscribersRead({ list: async () => ({ data, error: null }) })).resolves.toEqual({
      kind: "ok",
      data,
    });
  });
});
