export type TvIdleAgent = "schedule" | "visit" | "teamlead";

export function parseTvIdleAgent(value: string | null): TvIdleAgent | "unknown" {
  if (value === "schedule" || value === "visit" || value === "teamlead") return value;
  return "unknown";
}
