import { describe, expect, it } from "vitest";
import { parseLiveTaskImageDataUrl, parseLiveTaskImageRequest } from "@/modules/live-task/image-rules";

describe("Live Task image rules", () => {
  it("keeps the query agent and default", () => {
    expect(parseLiveTaskImageRequest("visit")).toEqual({ agentSlug: "visit" });
    expect(parseLiveTaskImageRequest(null)).toEqual({ agentSlug: "" });
  });

  it("parses the existing base64 data URL shape", () => {
    expect(parseLiveTaskImageDataUrl("data:image/jpeg;base64,abc123")).toEqual({
      contentType: "image/jpeg",
      base64: "abc123",
    });
    expect(parseLiveTaskImageDataUrl("https://example.test/image")).toBeNull();
    expect(parseLiveTaskImageDataUrl(null)).toBeNull();
  });
});
