import { z } from "zod";
import {
  PUSH_STYLE_DEFAULT,
  pushStyleSchema,
  type PushStyle,
} from "@/modules/agents/push-style";

export const ORDERS_SETTINGS_DEFAULTS = {
  reportTo: "",
  pushStyle: PUSH_STYLE_DEFAULT,
} as const;

const ordersSettingsWriteSchema = z
  .object({
    // Empty is a supported legacy/UI state; the runtime turns it into
    // missing_recipient rather than inventing a destination.
    reportTo: z.string().optional(),
    pushStyle: pushStyleSchema.optional(),
  })
  // The page payload may contain future or UI-only keys. They are preserved
  // here, but only the fields above become Orders runtime configuration.
  .passthrough();

const reportToSchema = z.string();

export interface OrdersSettings {
  reportTo: string;
  pushStyle: PushStyle;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Parse old JSON rows without letting malformed optional fields crash Orders. */
export function parseOrdersSettings(value: unknown): OrdersSettings {
  const raw = isRecord(value) ? value : {};
  const reportTo = reportToSchema.safeParse(raw.reportTo);
  const pushStyle = pushStyleSchema.safeParse(raw.pushStyle);

  return {
    reportTo: reportTo.success ? reportTo.data : ORDERS_SETTINGS_DEFAULTS.reportTo,
    pushStyle: pushStyle.success ? pushStyle.data : ORDERS_SETTINGS_DEFAULTS.pushStyle,
  };
}

export function validateOrdersSettingsForWrite(
  value: unknown,
): { success: true; value: Record<string, unknown> } | { success: false; message: string } {
  const result = ordersSettingsWriteSchema.safeParse(value);
  if (result.success) {
    // Preserve the raw UI/storage representation; do not let Zod strip or
    // rewrite unknown JSON fields during a PATCH.
    return { success: true, value: value as Record<string, unknown> };
  }

  const issue = result.error.issues[0];
  const path = issue?.path.length ? issue.path.join(".") : "settings";
  return { success: false, message: `Orders 設定無效（${path}）：${issue?.message ?? "格式錯誤"}` };
}
