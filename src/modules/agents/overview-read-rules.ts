export function parseAgentOverviewDays(raw: string | null): number {
  return Number(raw) || 7;
}
