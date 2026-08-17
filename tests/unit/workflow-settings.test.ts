import { describe, expect, it } from "vitest";
import {
  parseOrdersSettings,
  validateOrdersSettingsForWrite,
} from "@/modules/orders/settings";
import {
  parseSupportReportSettings,
  validateSupportReportSettingsForWrite,
} from "@/modules/support/settings";
import {
  parseTeamLeadReportSettings,
  validateTeamLeadReportSettingsForWrite,
} from "@/modules/reporting/team-lead-settings";

describe("workflow-owned settings boundaries", () => {
  it("parses legacy Orders rows with field-level defaults", () => {
    expect(parseOrdersSettings({ reportTo: " U123 ", pushStyle: "buttons", future: true })).toEqual({
      reportTo: " U123 ",
      pushStyle: "buttons",
    });
    expect(parseOrdersSettings({ reportTo: 123, pushStyle: "unknown" })).toEqual({
      reportTo: "",
      pushStyle: "flex",
    });
    expect(parseOrdersSettings([])).toEqual({ reportTo: "", pushStyle: "flex" });
  });

  it("validates Orders-owned fields while preserving UI/future payload", () => {
    const payload = { reportTo: "U123", pushStyle: "text", futureOrderKey: { version: 2 } };
    expect(validateOrdersSettingsForWrite(payload)).toEqual({ success: true, value: payload });
    expect(validateOrdersSettingsForWrite({ reportTo: 123 })).toMatchObject({
      success: false,
      message: expect.stringContaining("reportTo"),
    });
    expect(validateOrdersSettingsForWrite({ pushStyle: "card" })).toMatchObject({
      success: false,
      message: expect.stringContaining("pushStyle"),
    });
  });

  it("keeps Support UI-only fields out of the runtime parser", () => {
    const payload = {
      reportTo: "UOWNER",
      pushStyle: "confirm",
      autoReplyText: "目前只保存供頁面預覽",
      reportTime: "09:00",
    };
    expect(validateSupportReportSettingsForWrite(payload)).toEqual({ success: true, value: payload });
    expect(parseSupportReportSettings(payload)).toEqual({ reportTo: "UOWNER", pushStyle: "confirm" });
    expect(parseSupportReportSettings({ reportTo: false, pushStyle: "other" })).toEqual({
      reportTo: "",
      pushStyle: "flex",
    });
    expect(validateSupportReportSettingsForWrite({ pushStyle: "other" })).toMatchObject({
      success: false,
      message: expect.stringContaining("pushStyle"),
    });
  });

  it("keeps Team Lead reportTo independent from other workflows", () => {
    const payload = { reportTo: "UTEAM", pushStyle: "flex", reportTime: "09:00", future: "kept" };
    expect(validateTeamLeadReportSettingsForWrite(payload)).toEqual({ success: true, value: payload });
    expect(parseTeamLeadReportSettings(payload)).toEqual({ reportTo: "UTEAM", pushStyle: "flex" });
    expect(parseTeamLeadReportSettings({ reportTo: {}, pushStyle: null })).toEqual({
      reportTo: "",
      pushStyle: "flex",
    });
    expect(validateTeamLeadReportSettingsForWrite({ reportTo: 42 })).toMatchObject({
      success: false,
      message: expect.stringContaining("reportTo"),
    });
  });
});
