import "server-only";
import { getTrafficOverview } from "./ga4";
import { getSearchOverview } from "./gsc";

// 指揮台的「畫布」:老闆問 Ivy／Leo 要圖表時,與其等 LLM 用文字硬描述數字,
// 不如直接撈真實 GA4／GSC 資料、畫成真正的圖表,回傳結構化資料讓前端渲染
// 在畫面右側的畫布面板(像 Gemini Canvas 那樣),而不是塞在對話泡泡裡的一段話。

export interface Ga4TrendCanvas {
  kind: "ga4-trend";
  title: string;
  sessions: number;
  activeUsers: number;
  conversions: number;
  sessionsDelta: number | null;
  trend: { date: string; sessions: number }[];
  channels: { label: string; value: number }[];
}

export interface GscTrendCanvas {
  kind: "gsc-trend";
  title: string;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  clicksDelta: number | null;
  trend: { date: string; clicks: number }[];
  topQueries: { label: string; value: number }[];
}

export type CanvasPayload = Ga4TrendCanvas | GscTrendCanvas;

const CHART_KEYWORDS = /圖表|趨勢圖|流量圖|走勢|報表|成效圖|給我圖|畫.*圖/;

/** 依 Agent 與這句話的意圖,best-effort 撈真實資料做成畫布;抓不到或用不上就回 null,不影響文字回覆。 */
export async function buildCanvasForReply(agentSlug: string, message: string): Promise<CanvasPayload | null> {
  if (!CHART_KEYWORDS.test(message)) return null;

  try {
    if (agentSlug === "report") {
      const o = await getTrafficOverview(7);
      return {
        kind: "ga4-trend",
        title: "GA4 流量趨勢（近 7 天）",
        sessions: o.sessions,
        activeUsers: o.activeUsers,
        conversions: o.conversions,
        sessionsDelta: o.sessionsDelta,
        trend: o.dailyTrend.map((d) => ({ date: d.date.slice(5).replace("-", "/"), sessions: d.sessions })),
        channels: o.byChannel.map((c) => ({ label: c.channel || "(未分類)", value: c.sessions })),
      };
    }
    if (agentSlug === "expense") {
      const o = await getSearchOverview(7);
      return {
        kind: "gsc-trend",
        title: "SEO 成效趨勢（近 7 天）",
        totalClicks: o.totalClicks,
        totalImpressions: o.totalImpressions,
        avgCtr: o.avgCtr,
        avgPosition: o.avgPosition,
        clicksDelta: o.clicksDelta,
        trend: o.dailyTrend.map((d) => ({ date: d.date.slice(5).replace("-", "/"), clicks: d.clicks })),
        topQueries: o.topQueries.slice(0, 6).map((q) => ({ label: q.query || "(未分類)", value: q.clicks })),
      };
    }
  } catch {
    return null;
  }
  return null;
}
