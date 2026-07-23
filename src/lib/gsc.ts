import "server-only";
import { google } from "googleapis";
import { getGoogleOAuthClient, isoDate } from "./google-auth";

export interface SearchQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchDailyRow {
  date: string;
  clicks: number;
  impressions: number;
}

export interface SearchOverview {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topQueries: SearchQueryRow[];
  /** 跟前 7 天相比的變化：clicksDelta 正值＝流量成長；positionDelta 正值＝排名進步（名次數字變小） */
  clicksDelta: number | null;
  positionDelta: number | null;
  /** 近 14 天每日點擊／曝光，依日期由舊到新排序，給趨勢圖用 */
  dailyTrend: SearchDailyRow[];
}

/**
 * SEO 助理（Leo）用：讀取真實 Search Console 成效，並跟前一個等長區間比較。
 * GSC 資料通常有 2-3 天回報延遲，時間窗一律往回推 3 天，避免抓到還沒到齊的當日資料。
 * @param days 統計區間天數（預設 7），跟前 `days` 天比較，趨勢圖也顯示這 `days` 天。
 */
export async function getSearchOverview(days: number = 7): Promise<SearchOverview> {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error("Missing GSC_SITE_URL environment variable");

  const webmasters = google.webmasters({ version: "v3", auth: getGoogleOAuthClient() });

  const now = new Date();
  const end = new Date(now.getTime() - 3 * 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const endPrev = new Date(start.getTime() - 86400000);
  const startPrev = new Date(endPrev.getTime() - (days - 1) * 86400000);
  const rowLimit = Math.max(days, 20);

  const [current, previous, topQueries, daily] = await Promise.all([
    webmasters.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(start), endDate: isoDate(end) },
    }),
    webmasters.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(startPrev), endDate: isoDate(endPrev) },
    }),
    webmasters.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(start), endDate: isoDate(end), dimensions: ["query"], rowLimit: 10 },
    }),
    webmasters.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: isoDate(start), endDate: isoDate(end), dimensions: ["date"], rowLimit },
    }),
  ]);

  const curr = current.data.rows?.[0];
  const prev = previous.data.rows?.[0];

  return {
    totalClicks: curr?.clicks ?? 0,
    totalImpressions: curr?.impressions ?? 0,
    avgCtr: curr?.ctr ?? 0,
    avgPosition: curr?.position ?? 0,
    topQueries: (topQueries.data.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    })),
    clicksDelta: curr && prev ? (curr.clicks ?? 0) - (prev.clicks ?? 0) : null,
    positionDelta: curr && prev ? (prev.position ?? 0) - (curr.position ?? 0) : null,
    dailyTrend: (daily.data.rows ?? [])
      .map((r) => ({
        date: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
