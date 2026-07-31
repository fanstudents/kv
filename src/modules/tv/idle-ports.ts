export interface TvIdleWeekOverview {
  dayCounts: number[];
  upcoming: { label: string; title: string }[];
  warnings: string[];
}

export interface TvIdleActivityRow {
  agent_slug: string | null;
  status: string;
}

export interface TvIdlePort {
  listWeekOverview(): Promise<TvIdleWeekOverview>;
  getAvailableTags(): Promise<string[]>;
  listRecentActivity(cutoff: string): Promise<TvIdleActivityRow[]>;
}
