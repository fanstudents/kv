import type { TvIdlePort, TvIdleWeekOverview } from "./idle-ports";
import type { TvIdleAgent } from "./idle-rules";

const SCHEDULE_TTL = 10 * 60 * 1000;

export type TvIdleResult =
  | { kind: "schedule"; data: TvIdleWeekOverview; cached: boolean }
  | { kind: "visit"; data: { tags: string[] } }
  | { kind: "teamlead"; data: { total: number; failed: number; top: { slug: string; count: number }[] } }
  | { kind: "unknown" };

export function createTvIdleApplication(port: TvIdlePort) {
  let scheduleCache: { at: number; data: TvIdleWeekOverview } | null = null;

  return {
    async run(agent: TvIdleAgent | "unknown"): Promise<TvIdleResult> {
      if (agent === "schedule") {
        if (scheduleCache && Date.now() - scheduleCache.at < SCHEDULE_TTL) {
          return { kind: "schedule", data: scheduleCache.data, cached: true };
        }
        const data = await port.listWeekOverview();
        scheduleCache = { at: Date.now(), data };
        return { kind: "schedule", data, cached: false };
      }

      if (agent === "visit") {
        return { kind: "visit", data: { tags: await port.getAvailableTags() } };
      }

      if (agent === "teamlead") {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const rows = await port.listRecentActivity(cutoff);
        const byAgent = new Map<string, number>();
        let failed = 0;
        rows.forEach((row) => {
          if (row.status === "failed") failed++;
          if (row.agent_slug) byAgent.set(row.agent_slug, (byAgent.get(row.agent_slug) ?? 0) + 1);
        });
        const top = [...byAgent.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([slug, count]) => ({ slug, count }));
        return { kind: "teamlead", data: { total: rows.length, failed, top } };
      }

      return { kind: "unknown" };
    },
  };
}
