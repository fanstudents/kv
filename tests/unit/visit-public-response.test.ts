import { describe, expect, it } from "vitest";
import {
  normalizeVisitLocation,
  parseVisitInviteChoice,
  selectVisitInviteSlot,
} from "@/modules/visit/public-response";

const slots = {
  chosen_slot: "1",
  slot1: "Monday 09:00",
  slot2: "Tuesday 14:00",
  slot1_start: "2026-08-03T01:00:00.000Z",
  slot1_end: "2026-08-03T02:00:00.000Z",
  slot2_start: "2026-08-04T06:00:00.000Z",
  slot2_end: "2026-08-04T07:00:00.000Z",
};

describe("Visit public response", () => {
  it.each(["1", "2", "both"] as const)("accepts invite choice %s", (choice) => {
    expect(parseVisitInviteChoice(choice)).toBe(choice);
  });

  it.each([null, "", "0", "3", "BOTH"])("rejects invalid invite choice %s", (choice) => {
    expect(parseVisitInviteChoice(choice)).toBeUndefined();
  });

  it("preserves location trimming, maximum length, and blank semantics", () => {
    expect(normalizeVisitLocation("  台北辦公室  ")).toBe("台北辦公室");
    expect(normalizeVisitLocation("x".repeat(101))).toBe("x".repeat(100));
    expect(normalizeVisitLocation("   ")).toBeUndefined();
    expect(normalizeVisitLocation(null)).toBeUndefined();
  });

  it("selects slot two only for choice 2", () => {
    expect(selectVisitInviteSlot({ ...slots, chosen_slot: "2" })).toEqual({
      label: "Tuesday 14:00",
      startISO: "2026-08-04T06:00:00.000Z",
      endISO: "2026-08-04T07:00:00.000Z",
    });
    expect(selectVisitInviteSlot({ ...slots, chosen_slot: "both" })).toEqual({
      label: "Monday 09:00",
      startISO: "2026-08-03T01:00:00.000Z",
      endISO: "2026-08-03T02:00:00.000Z",
    });
  });
});
