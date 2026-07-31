import { describe, expect, it } from "vitest";
import { parseActivityReadRequest } from "@/modules/activity/read-rules";

describe("activity read rules", () => {
  it("preserves status and numeric limit coercion", () => {
    expect(parseActivityReadRequest("failed", "25")).toEqual({ status: "failed", limit: 25 });
    expect(parseActivityReadRequest(null, null)).toEqual({ status: null, limit: 200 });
  });

  it("keeps empty status and invalid numeric values compatible", () => {
    expect(parseActivityReadRequest("", "oops")).toEqual({ status: "", limit: Number.NaN });
  });
});
