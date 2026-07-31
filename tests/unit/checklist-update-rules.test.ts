import { describe, expect, it } from "vitest";
import { parseChecklistUpdateRequest } from "@/modules/checklist/update-rules";

describe("parseChecklistUpdateRequest", () => {
  it("coerces done and keeps the route id", () => {
    expect(parseChecklistUpdateRequest("item-1", { done: 1 })).toEqual({ itemId: "item-1", done: true });
    expect(parseChecklistUpdateRequest("item-1", { done: 0 })).toEqual({ itemId: "item-1", done: false });
  });

  it("treats invalid or missing JSON as an unchecked value", () => {
    expect(parseChecklistUpdateRequest("item-1", null)).toEqual({ itemId: "item-1", done: false });
    expect(parseChecklistUpdateRequest("item-1", {})).toEqual({ itemId: "item-1", done: false });
  });
});
