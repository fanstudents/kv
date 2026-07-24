import type { SearchOverview } from "./gsc";

// SEO 尖兵(Leo)用:GSC 關鍵字排名示範資料——介面示範，錄影／展示用途，暫時取代真實 GSC 串接。
// 想改回真實資料，把 expense page／劇場模式改回呼叫 /api/agents/expense/seo-overview 即可，
// 形狀完全比照 SearchOverview,隨時可以切回。

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date(Date.UTC(2026, 6, 23)); // 基準日 2026-07-23
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const GSC_DEMO_TREND_30D: { date: string; clicks: number; impressions: number }[] = Array.from(
  { length: 30 },
  (_, i) => {
    const daysAgo = 29 - i;
    const dow = new Date(`${isoDateDaysAgo(daysAgo)}T00:00:00Z`).getUTCDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.82 : 1;
    const trendUp = 1 + (29 - daysAgo) * 0.01;
    const wave = 1 + 0.05 * Math.sin(i / 2.7 + 1);
    const impressions = Math.round(1450 * trendUp * weekendDip * wave);
    const clicks = Math.round(impressions * (0.044 + 0.006 * Math.sin(i / 3)));
    return { date: isoDateDaysAgo(daysAgo), clicks, impressions };
  }
);

export const GSC_DEMO_TOP_QUERIES: SearchOverview["topQueries"] = [
  { query: "ai 行銷 agent", clicks: 412, impressions: 8600, ctr: 0.048, position: 3.2 },
  { query: "line 官方帳號 自動化", clicks: 356, impressions: 7100, ctr: 0.05, position: 4.1 },
  { query: "ai 客服 系統推薦", clicks: 298, impressions: 6400, ctr: 0.047, position: 5.6 },
  { query: "行銷 自動化 工具", clicks: 245, impressions: 5900, ctr: 0.042, position: 6.8 },
  { query: "ga4 報表 自動化", clicks: 188, impressions: 4200, ctr: 0.045, position: 7.4 },
  { query: "seo 關鍵字 排名 追蹤", clicks: 162, impressions: 3800, ctr: 0.043, position: 8.1 },
  { query: "企業 ai agent 導入", clicks: 134, impressions: 3100, ctr: 0.043, position: 9.5 },
];

export function buildSearchDemo(days: number): SearchOverview {
  const dailyTrend = GSC_DEMO_TREND_30D.slice(-days);
  const totalClicks = dailyTrend.reduce((s, d) => s + d.clicks, 0);
  const totalImpressions = dailyTrend.reduce((s, d) => s + d.impressions, 0);
  const avgCtr = totalImpressions ? totalClicks / totalImpressions : 0;

  const prevWindow = GSC_DEMO_TREND_30D.slice(-days * 2, -days);
  const prevClicks = prevWindow.reduce((s, d) => s + d.clicks, 0) || totalClicks;
  const clicksDelta = totalClicks - prevClicks;

  const queryImpressions = GSC_DEMO_TOP_QUERIES.reduce((s, q) => s + q.impressions, 0);
  const avgPosition = GSC_DEMO_TOP_QUERIES.reduce((s, q) => s + q.position * q.impressions, 0) / queryImpressions;

  return {
    totalClicks,
    totalImpressions,
    avgCtr,
    avgPosition,
    topQueries: GSC_DEMO_TOP_QUERIES,
    clicksDelta,
    positionDelta: 0.6,
    dailyTrend,
  };
}
