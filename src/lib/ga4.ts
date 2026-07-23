import "server-only";
import { google } from "googleapis";
import { ensureFreshAccessToken, getGoogleOAuthClient } from "./google-auth";

export interface ChannelRow {
  channel: string;
  sessions: number;
  conversions: number;
}

export interface TrafficDailyRow {
  date: string;
  sessions: number;
  conversions: number;
}

export interface TrafficOverview {
  sessions: number;
  activeUsers: number;
  conversions: number;
  /** 跟前 7 天相比的變化，正值＝成長 */
  sessionsDelta: number | null;
  byChannel: ChannelRow[];
  /** 近 14 天每日工作階段／轉換，依日期由舊到新排序，給趨勢圖用 */
  dailyTrend: TrafficDailyRow[];
}

/**
 * 數據助理（Ivy）用：讀取真實 GA4 流量與轉換，並跟前一個等長區間比較、拆分渠道。
 * @param days 統計區間天數（預設 7），跟前 `days` 天比較，趨勢圖也顯示這 `days` 天。
 */
export async function getTrafficOverview(days: number = 7): Promise<TrafficOverview> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error("Missing GA4_PROPERTY_ID environment variable");

  const authClient = getGoogleOAuthClient();
  await ensureFreshAccessToken(authClient);
  const analyticsdata = google.analyticsdata({ version: "v1beta", auth: authClient });
  const property = `properties/${propertyId}`;

  const [overview, byChannel, daily] = await Promise.all([
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [
          { startDate: `${days}daysAgo`, endDate: "today" },
          { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` },
        ],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }],
      },
    }),
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "6",
      },
    }),
    analyticsdata.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "conversions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
    }),
  ]);

  const rows = overview.data.rows ?? [];
  // 有 >1 個 dateRanges 又沒指定 dimensions 時，GA4 會自動補一個 dateRange 虛擬欄位
  // （值為 "date_range_0" / "date_range_1"）用來區分兩段區間的列。
  const curr = rows.find((r) => r.dimensionValues?.[0]?.value === "date_range_0");
  const prev = rows.find((r) => r.dimensionValues?.[0]?.value === "date_range_1");

  const num = (v: string | null | undefined) => Number(v ?? 0);
  // GA4 的 date 維度是 "YYYYMMDD" 字串，轉成 "YYYY-MM-DD" 方便跟 GSC 的日期格式一致、也方便畫圖
  const toIsoDate = (yyyymmdd: string) =>
    yyyymmdd.length === 8 ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}` : yyyymmdd;

  return {
    sessions: num(curr?.metricValues?.[0]?.value),
    activeUsers: num(curr?.metricValues?.[1]?.value),
    conversions: num(curr?.metricValues?.[2]?.value),
    sessionsDelta: curr && prev ? num(curr.metricValues?.[0]?.value) - num(prev.metricValues?.[0]?.value) : null,
    byChannel: (byChannel.data.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? "",
      sessions: num(r.metricValues?.[0]?.value),
      conversions: num(r.metricValues?.[1]?.value),
    })),
    dailyTrend: (daily.data.rows ?? []).map((r) => ({
      date: toIsoDate(r.dimensionValues?.[0]?.value ?? ""),
      sessions: num(r.metricValues?.[0]?.value),
      conversions: num(r.metricValues?.[1]?.value),
    })),
  };
}
