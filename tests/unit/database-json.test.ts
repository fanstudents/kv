import { describe, expect, it } from "vitest";
import { isDatabaseJson } from "@/lib/database-json";

describe("database JSON boundary", () => {
  it("accepts JSON values used by database-backed adapters", () => {
    expect(isDatabaseJson({ stage: "card_review", nested: [true, 2, null] })).toBe(true);
  });

  it("rejects values that cannot be represented as JSON", () => {
    expect(isDatabaseJson(new Date())).toBe(false);
    expect(isDatabaseJson({ callback: () => undefined })).toBe(false);
    expect(isDatabaseJson(undefined)).toBe(false);
  });
});
