import { describe, expect, it } from "vitest";
import {
  parseVisitRuntimeSettings,
  validateVisitSettingsForWrite,
} from "@/modules/visit/settings";

describe("Visit settings boundary", () => {
  it("projects legacy strings and numbers into the typed runtime config", () => {
    expect(
      parseVisitRuntimeSettings({
        rangeStartDays: "4",
        rangeEndDays: 9,
        meetingDuration: "45",
        meetingType: "線上會議",
        workingHoursStart: "10:00",
        workingHoursEnd: "17:30",
        senderName: "Dennis",
        requireApproval: false,
        futureVisitKey: { enabled: true },
      }),
    ).toEqual({
      rangeStartDays: 4,
      rangeEndDays: 9,
      meetingDuration: 45,
      meetingType: "線上會議",
      workingHoursStart: "10:00",
      workingHoursEnd: "17:30",
      senderName: "Dennis",
      requireApproval: false,
    });
  });

  it("keeps compatibility defaults and repairs invalid cross-field legacy values", () => {
    expect(
      parseVisitRuntimeSettings({
        rangeStartDays: 0,
        rangeEndDays: 2,
        meetingDuration: "invalid",
        workingHoursStart: "18:00",
        workingHoursEnd: "09:00",
        meetingType: "",
        senderName: "",
        requireApproval: "false",
      }),
    ).toEqual({
      rangeStartDays: 3,
      rangeEndDays: 7,
      meetingDuration: 60,
      meetingType: "喝咖啡",
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      senderName: "樊松蒲 Dennis",
      requireApproval: true,
    });
  });

  it("validates the Visit-owned fields but preserves the raw UI/storage payload", () => {
    const payload = {
      inputSources: ["名片圖片"],
      rangeStartDays: "3",
      rangeEndDays: "7",
      meetingDuration: "60",
      meetingType: "喝咖啡",
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      senderName: "Dennis",
      requireApproval: true,
      futureVisitKey: { version: 2 },
    };

    const result = validateVisitSettingsForWrite(payload);
    expect(result).toEqual({ success: true, value: payload });
    if (result.success) expect(result.value).toBe(payload);
  });

  it("rejects invalid ranges and time ordering at the write boundary", () => {
    expect(
      validateVisitSettingsForWrite({ rangeStartDays: "8", rangeEndDays: "3" }),
    ).toMatchObject({ success: false, message: expect.stringContaining("rangeEndDays") });
    expect(
      validateVisitSettingsForWrite({ workingHoursStart: "18:00", workingHoursEnd: "09:00" }),
    ).toMatchObject({ success: false, message: expect.stringContaining("workingHoursEnd") });
  });
});
