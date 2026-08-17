import { z } from "zod";
import { pushStyleSchema } from "@/modules/agents/push-style";

export const VISIT_SETTINGS_DEFAULTS = {
  rangeStartDays: 3,
  rangeEndDays: 7,
  meetingDuration: 60,
  meetingType: "喝咖啡",
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  senderName: "樊松蒲 Dennis",
  requireApproval: true,
} as const;

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const finiteInteger = z.number().refine(Number.isFinite, "必須是有限數字").int("必須是整數");

/**
 * The dashboard keeps number inputs as strings, while existing JSON rows may
 * contain either strings or numbers. Validate both forms without coercing the
 * raw object that is eventually persisted.
 */
const integerInput = z
  .union([finiteInteger, z.string().trim().min(1).regex(/^\d+$/, "必須是非負整數")])
  .transform((value) => (typeof value === "string" ? Number(value) : value))
  .pipe(finiteInteger);

const nonEmptyText = z.string().trim().min(1, "不可為空白");

const visitSettingsWriteSchema = z
  .object({
    rangeStartDays: integerInput.pipe(z.number().min(0)).optional(),
    rangeEndDays: integerInput.pipe(z.number().min(1)).optional(),
    meetingDuration: integerInput.pipe(z.number().min(15)).optional(),
    meetingType: nonEmptyText.optional(),
    workingHoursStart: z.string().regex(TIME_PATTERN, "格式必須是 HH:mm").optional(),
    workingHoursEnd: z.string().regex(TIME_PATTERN, "格式必須是 HH:mm").optional(),
    senderName: nonEmptyText.optional(),
    requireApproval: z.boolean().optional(),
    pushStyle: pushStyleSchema.optional(),
  })
  // UI-only fields and future Visit fields remain in the JSON payload. The
  // boundary validates the keys this workflow actually owns without stripping
  // fields it does not own.
  .passthrough()
  .superRefine((settings, context) => {
    if (
      settings.rangeStartDays !== undefined &&
      settings.rangeEndDays !== undefined &&
      settings.rangeStartDays > settings.rangeEndDays
    ) {
      context.addIssue({
        code: "custom",
        path: ["rangeEndDays"],
        message: "搜尋結束天數不可早於起始天數",
      });
    }

    if (
      settings.workingHoursStart !== undefined &&
      settings.workingHoursEnd !== undefined &&
      toMinutes(settings.workingHoursEnd) <= toMinutes(settings.workingHoursStart)
    ) {
      context.addIssue({
        code: "custom",
        path: ["workingHoursEnd"],
        message: "結束時間必須晚於開始時間",
      });
    }
  });

export type VisitPersistedSettings = Record<string, unknown>;

export interface VisitRuntimeSettings {
  rangeStartDays: number;
  rangeEndDays: number;
  meetingDuration: number;
  meetingType: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  senderName: string;
  requireApproval: boolean;
}

const visitRuntimeSettingsSchema = z
  .object({
    rangeStartDays: finiteInteger.pipe(z.number().min(0)),
    rangeEndDays: finiteInteger.pipe(z.number().min(1)),
    meetingDuration: finiteInteger.pipe(z.number().min(15)),
    meetingType: nonEmptyText,
    workingHoursStart: z.string().regex(TIME_PATTERN),
    workingHoursEnd: z.string().regex(TIME_PATTERN),
    senderName: nonEmptyText,
    requireApproval: z.boolean(),
  })
  .superRefine((settings, context) => {
    if (settings.rangeStartDays > settings.rangeEndDays) {
      context.addIssue({
        code: "custom",
        path: ["rangeEndDays"],
        message: "搜尋結束天數不可早於起始天數",
      });
    }
    if (toMinutes(settings.workingHoursEnd) <= toMinutes(settings.workingHoursStart)) {
      context.addIssue({
        code: "custom",
        path: ["workingHoursEnd"],
        message: "結束時間必須晚於開始時間",
      });
    }
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function parseInteger(value: unknown, fallback: number, minimum: number): number {
  const result = integerInput.safeParse(value);
  if (!result.success || result.data < minimum) return fallback;
  return result.data;
}

function parseText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function parseTime(value: unknown, fallback: string): string {
  return typeof value === "string" && TIME_PATTERN.test(value) ? value : fallback;
}

/**
 * Parse the durable JSON shape into the only Visit settings shape consumed by
 * runtime code. Unknown keys stay in the persisted object; they are simply not
 * projected into this domain runtime config.
 */
export function parseVisitRuntimeSettings(value: unknown): VisitRuntimeSettings {
  const raw = isRecord(value) ? value : {};
  const rangeStartDays = parseInteger(
    raw.rangeStartDays,
    VISIT_SETTINGS_DEFAULTS.rangeStartDays,
    // Keep the existing adapter contract: Number(value) || 3 treated zero as
    // a missing value even though the UI input advertises min=0.
    1,
  );
  let rangeEndDays = parseInteger(raw.rangeEndDays, VISIT_SETTINGS_DEFAULTS.rangeEndDays, 1);
  if (rangeEndDays < rangeStartDays) rangeEndDays = Math.max(rangeStartDays, VISIT_SETTINGS_DEFAULTS.rangeEndDays);

  let workingHoursStart = parseTime(raw.workingHoursStart, VISIT_SETTINGS_DEFAULTS.workingHoursStart);
  let workingHoursEnd = parseTime(raw.workingHoursEnd, VISIT_SETTINGS_DEFAULTS.workingHoursEnd);
  if (toMinutes(workingHoursEnd) <= toMinutes(workingHoursStart)) {
    workingHoursStart = VISIT_SETTINGS_DEFAULTS.workingHoursStart;
    workingHoursEnd = VISIT_SETTINGS_DEFAULTS.workingHoursEnd;
  }

  const candidate = {
    rangeStartDays,
    rangeEndDays,
    meetingDuration: parseInteger(raw.meetingDuration, VISIT_SETTINGS_DEFAULTS.meetingDuration, 15),
    meetingType: parseText(raw.meetingType, VISIT_SETTINGS_DEFAULTS.meetingType),
    workingHoursStart,
    workingHoursEnd,
    senderName: parseText(raw.senderName, VISIT_SETTINGS_DEFAULTS.senderName),
    requireApproval:
      typeof raw.requireApproval === "boolean"
        ? raw.requireApproval
        : VISIT_SETTINGS_DEFAULTS.requireApproval,
  } satisfies VisitRuntimeSettings;

  // This final parse is intentionally kept even though the field-level
  // compatibility parsing above is defensive: it makes the runtime contract
  // executable and prevents a future parser edit from returning an invalid
  // config to the Visit workflow.
  return visitRuntimeSettingsSchema.parse(candidate);
}

export function validateVisitSettingsForWrite(
  value: unknown,
): { success: true; value: VisitPersistedSettings } | { success: false; message: string } {
  const result = visitSettingsWriteSchema.safeParse(value);
  if (result.success) {
    // Return the original object, not result.data. Zod transforms number-like
    // strings to numbers; persisting result.data would silently change the
    // existing UI/storage representation.
    return { success: true, value: value as VisitPersistedSettings };
  }

  const issue = result.error.issues[0];
  const path = issue?.path.length ? issue.path.join(".") : "settings";
  return { success: false, message: `Visit 設定無效（${path}）：${issue?.message ?? "格式錯誤"}` };
}
