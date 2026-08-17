import { z } from "zod";
import {
  PUSH_STYLE_DEFAULT,
  pushStyleSchema,
  type PushStyle,
} from "@/modules/agents/push-style";

export const TEAM_LEAD_REPORT_SETTINGS_DEFAULTS = {
  reportTo: "",
  pushStyle: PUSH_STYLE_DEFAULT,
} as const;

const teamLeadReportSettingsWriteSchema = z
  .object({
    // Team Lead owns its own report destination. reportTime remains a page
    // projection until a real scheduler consumer proves otherwise.
    reportTo: z.string().optional(),
    pushStyle: pushStyleSchema.optional(),
  })
  .passthrough();

const reportToSchema = z.string();

export interface TeamLeadReportSettings {
  reportTo: string;
  pushStyle: PushStyle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Parse the legacy JSON row into Team Lead's runtime-owned settings only. */
export function parseTeamLeadReportSettings(value: unknown): TeamLeadReportSettings {
  const raw = isRecord(value) ? value : {};
  const reportTo = reportToSchema.safeParse(raw.reportTo);
  const pushStyle = pushStyleSchema.safeParse(raw.pushStyle);

  return {
    reportTo: reportTo.success ? reportTo.data : TEAM_LEAD_REPORT_SETTINGS_DEFAULTS.reportTo,
    pushStyle: pushStyle.success ? pushStyle.data : TEAM_LEAD_REPORT_SETTINGS_DEFAULTS.pushStyle,
  };
}

export function validateTeamLeadReportSettingsForWrite(
  value: unknown,
): { success: true; value: Record<string, unknown> } | { success: false; message: string } {
  const result = teamLeadReportSettingsWriteSchema.safeParse(value);
  if (result.success) {
    return { success: true, value: value as Record<string, unknown> };
  }

  const issue = result.error.issues[0];
  const path = issue?.path.length ? issue.path.join(".") : "settings";
  return { success: false, message: `Team Lead 設定無效（${path}）：${issue?.message ?? "格式錯誤"}` };
}
