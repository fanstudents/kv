import { describe, expect, it, vi } from "vitest";
import { runSubscribersUpdate } from "@/modules/subscribers/update-application";

describe("runSubscribersUpdate", () => {
  const input = { kind: "ok" as const, id: "s1", update: { tags: ["vip"] } };

  it("returns provider data for a valid update", async () => {
    await expect(
      runSubscribersUpdate(input, { update: async () => ({ data: { id: "s1" }, error: null }) }),
    ).resolves.toEqual({ kind: "ok", data: { id: "s1" } });
  });

  it("maps invalid requests and provider errors", async () => {
    await expect(
      runSubscribersUpdate({ kind: "invalid", message: "沒有可更新的欄位" }, { update: vi.fn() }),
    ).resolves.toEqual({ kind: "error", message: "沒有可更新的欄位" });
    await expect(
      runSubscribersUpdate(input, { update: async () => ({ data: null, error: { message: "write failed" } }) }),
    ).resolves.toEqual({ kind: "error", message: "write failed" });
  });
});
