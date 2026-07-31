import { describe, expect, it } from "vitest";
import { parseActivityReadRequest, parseAgentActivityReadRequest } from "@/modules/activity/read-rules";

describe("activity read rules", () => {
  it("preserves status and numeric limit coercion", () => {
    expect(parseActivityReadRequest("failed", "25")).toEqual({ agentSlug: null, status: "failed", limit: 25 });
    expect(parseActivityReadRequest(null, null)).toEqual({ agentSlug: null, status: null, limit: 200 });
  });

  it("keeps empty status and invalid numeric values compatible", () => {
    expect(parseActivityReadRequest("", "oops")).toEqual({ agentSlug: null, status: "", limit: Number.NaN });
  });

  it("keeps agent activity on the fixed twenty-row read", () => {
    expect(parseAgentActivityReadRequest("visit")).toEqual({ agentSlug: "visit", status: null, limit: 20 });
  });
});
