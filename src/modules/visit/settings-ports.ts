import type { VisitRuntimeSettings } from "@/modules/visit/settings";

export type VisitSettings = VisitRuntimeSettings;

export interface VisitSettingsPort {
  get(): Promise<VisitSettings>;
}
