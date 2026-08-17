import { z } from "zod";
import {
  PUSH_STYLE_DEFAULT,
  pushStyleSchema,
  type PushStyle,
} from "@/modules/agents/push-style";

export const SUPPORT_REPORT_SETTINGS_DEFAULTS = {
  reportTo: "",
  pushStyle: PUSH_STYLE_DEFAULT,
} as const;

const supportReportSettingsWriteSchema = z
  .object({
    // Support owns the report destination. autoReplyText/reportTime are kept
    // as page payload but are currently UI-only and must not become runtime
    // policy by appearing in this type.
    reportTo: z.string().optional(),
    pushStyle: pushStyleSchema.optional(),
  })
  .passthrough();

const reportToSchema = z.string();

export interface SupportReportSettings {
  reportTo: string;
  pushStyle: PushStyle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Parse the legacy JSON row into Support's runtime-owned settings only. */
export function parseSupportReportSettings(value: unknown): SupportReportSettings {
  const raw = isRecord(value) ? value : {};
  const reportTo = reportToSchema.safeParse(raw.reportTo);
  const pushStyle = pushStyleSchema.safeParse(raw.pushStyle);

  return {
    reportTo: reportTo.success ? reportTo.data : SUPPORT_REPORT_SETTINGS_DEFAULTS.reportTo,
    pushStyle: pushStyle.success ? pushStyle.data : SUPPORT_REPORT_SETTINGS_DEFAULTS.pushStyle,
  };
}

export function validateSupportReportSettingsForWrite(
  value: unknown,
): { success: true; value: Record<string, unknown> } | { success: false; message: string } {
  const result = supportReportSettingsWriteSchema.safeParse(value);
  if (result.success) {
    return { success: true, value: value as Record<string, unknown> };
  }

  const issue = result.error.issues[0];
  const path = issue?.path.length ? issue.path.join(".") : "settings";
  return { success: false, message: `Support 設定無效（${path}）：${issue?.message ?? "格式錯誤"}` };
}
