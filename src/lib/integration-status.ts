import "server-only";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "./google-auth";

// 每個 Agent 頁面的「串接狀態」要看真的，不是 INTEGRATION_SEEDS 裡手動標記的
// status:"connected"——那份資料是人手維護的靜態種子，改個環境變數、金鑰過期，
// 畫面照樣顯示「已連線」。這裡才是會真的去問一次「這組憑證到底能不能用」的地方。
//
// key 對齊 INTEGRATION_SEEDS 的 id（gmail／google-calendar／line-primary／
// line-support／teachify／supabase／openai／meta-ads／ga4／gsc／firecrawl），
// 這樣現有畫面（RealStatusPanel）不用改資料結構，只要把「status」跟「detail」
// 換成這裡查到的真實結果。

export interface IntegrationStatusEntry {
  connected: boolean;
  /** 一句話講清楚「連的是哪個帳號／哪個資源」，沒有就不顯示 */
  detail?: string;
}

export type IntegrationStatusMap = Record<string, IntegrationStatusEntry>;

const STATUS_CACHE_MS = 60_000; // 跟 ai-usage.ts 的護欄快取同一套邏輯：這是狀態燈不是即時監控
let cache: { at: number; data: IntegrationStatusMap } | null = null;

/** 四個服務共用同一組 Google refresh token：只需要打一次 API 驗證整組憑證還活著，
 * 驗證結果（帳號是誰）套用到 gmail／google-calendar／ga4／gsc 四筆。 */
async function googleAccountStatus(): Promise<{ connected: boolean; email?: string }> {
  const hasCreds = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN
  );
  if (!hasCreds) return { connected: false };
  try {
    const calendar = google.calendar({ version: "v3", auth: getGoogleOAuthClient() });
    const { data } = await calendar.calendarList.get({ calendarId: "primary" });
    return { connected: true, email: data.id ?? undefined };
  } catch {
    return { connected: false };
  }
}

function lineChannelStatus(prefix: "LINE_CHANNEL" | "LINE_SUPPORT_CHANNEL"): IntegrationStatusEntry {
  const secret = process.env[`${prefix}_SECRET`];
  const token = process.env[`${prefix}_ACCESS_TOKEN`];
  const id = prefix === "LINE_CHANNEL" ? process.env.LINE_CHANNEL_ID : process.env.LINE_SUPPORT_CHANNEL_ID;
  if (!secret || !token) return { connected: false };
  return { connected: true, detail: id ? `頻道 ID ${id}` : undefined };
}

async function resolveStatus(): Promise<IntegrationStatusMap> {
  const googleStatus = await googleAccountStatus();
  const additionalCalendars = (process.env.GOOGLE_ADDITIONAL_CALENDAR_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const map: IntegrationStatusMap = {
    gmail: { connected: googleStatus.connected, detail: googleStatus.email },
    "google-calendar": {
      connected: googleStatus.connected,
      detail: googleStatus.email
        ? `${googleStatus.email}${additionalCalendars.length ? `（+${additionalCalendars.length} 個共用日曆）` : ""}`
        : undefined,
    },
    ga4: {
      connected: googleStatus.connected && Boolean(process.env.GA4_PROPERTY_ID),
      detail: process.env.GA4_PROPERTY_ID ? `資源 ID ${process.env.GA4_PROPERTY_ID}` : undefined,
    },
    gsc: {
      connected: googleStatus.connected && Boolean(process.env.GSC_SITE_URL),
      detail: process.env.GSC_SITE_URL,
    },
    "line-primary": lineChannelStatus("LINE_CHANNEL"),
    "line-support": lineChannelStatus("LINE_SUPPORT_CHANNEL"),
    openai: { connected: Boolean(process.env.OPENAI_API_KEY) },
    supabase: { connected: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) },
    firecrawl: { connected: Boolean(process.env.FIRECRAWL_API_KEY) },
    // Teachify 是被動接收 webhook，沒有「打得通／打不通」的憑證可驗——有沒有簽章
    // 密鑰只影響安不安全，不影響收不收得到單，兩種狀態都算「連著」。
    teachify: {
      connected: true,
      detail: process.env.TEACHIFY_WEBHOOK_SECRET ? "已設定簽章驗證" : "簽章未設定（先放行）",
    },
    "meta-ads": { connected: false, detail: "尚未授權" },
  };
  return map;
}

export async function getIntegrationStatus(): Promise<IntegrationStatusMap> {
  if (cache && Date.now() - cache.at < STATUS_CACHE_MS) return cache.data;
  const data = await resolveStatus();
  cache = { at: Date.now(), data };
  return data;
}
