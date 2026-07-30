import { describe, expect, it } from "vitest";
import { parseLiveTaskReadRequest } from "@/modules/live-task/read-rules";

describe("Live Task read rules", () => {
  it("keeps the agent query string", () => {
    expect(parseLiveTaskReadRequest("visit")).toEqual({ agentSlug: "visit" });
  });

  it("defaults a missing or non-string agent to empty", () => {
    expect(parseLiveTaskReadRequest(null)).toEqual({ agentSlug: "" });
    expect(parseLiveTaskReadRequest({})).toEqual({ agentSlug: "" });
  });
});
