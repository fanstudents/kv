import type { LegacyPendingInviteRow } from "@/modules/visit/legacy-schema";

export type VisitInviteChoice = NonNullable<LegacyPendingInviteRow["chosen_slot"]>;

export interface VisitInviteSlotFields {
  chosen_slot: string | null;
  slot1: string;
  slot2: string;
  slot1_start: string;
  slot1_end: string;
  slot2_start: string;
  slot2_end: string;
}

export function parseVisitInviteChoice(value: string | null): VisitInviteChoice | undefined {
  return value === "1" || value === "2" || value === "both" ? value : undefined;
}

export function normalizeVisitLocation(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim().slice(0, 100) || undefined;
}

export function selectVisitInviteSlot(row: VisitInviteSlotFields) {
  const useSlot2 = row.chosen_slot === "2";
  return {
    label: useSlot2 ? row.slot2 : row.slot1,
    startISO: useSlot2 ? row.slot2_start : row.slot1_start,
    endISO: useSlot2 ? row.slot2_end : row.slot1_end,
  };
}
