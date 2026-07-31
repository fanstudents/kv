import { describe, expect, it } from "vitest";
import { parseSubscribersUpdateRequest } from "@/modules/subscribers/update-rules";

describe("parseSubscribersUpdateRequest", () => {
  it("keeps non-empty tags and note fields", () => {
    expect(parseSubscribersUpdateRequest("s1", { tags: [" vip ", "", 1, "  "], note: "memo" })).toEqual({
      kind: "ok",
      id: "s1",
      update: { tags: [" vip "], note: "memo" },
    });
  });

  it("rejects a body with no recognized fields", () => {
    expect(parseSubscribersUpdateRequest("s1", null)).toEqual({
      kind: "invalid",
      message: "沒有可更新的欄位",
    });
    expect(parseSubscribersUpdateRequest("s1", { unknown: true })).toEqual({
      kind: "invalid",
      message: "沒有可更新的欄位",
    });
  });
});
