import { describe, expect, it } from "vitest";
import { parseSupportLogReplyRequest } from "@/modules/support/log-reply-rules";

describe("Support log-reply request rules", () => {
  it("keeps string userId and text without trimming", () => {
    expect(parseSupportLogReplyRequest({ userId: "U123", text: " 回覆 " })).toEqual({
      userId: "U123",
      text: " 回覆 ",
    });
  });

  it("defaults malformed payload fields to empty strings", () => {
    expect(parseSupportLogReplyRequest(null)).toEqual({ userId: "", text: "" });
    expect(parseSupportLogReplyRequest({ userId: 123, text: null })).toEqual({ userId: "", text: "" });
  });
});
