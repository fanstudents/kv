import type { AgentSlug } from "./types";

// 串接服務管理：每個服務記錄「管理連結」與「哪位 Agent 用到哪個功能」。
// 頁面允許使用者新增／編輯，異動存於瀏覽器 localStorage（介面示範，未接後端）。

export interface IntegrationUse {
  agent: AgentSlug;
  feature: string;
}

export interface Integration {
  id: string;
  name: string;
  provider: string;
  category: string;
  /** 服務的管理主控台連結 */
  link: string;
  status: "connected" | "disconnected";
  note?: string;
  /** lucide 圖標鍵（頁面內對照表解析，未知鍵 fallback 為 Blocks） */
  icon: string;
  /** 品牌色，用於圖標底座 */
  color: string;
  uses: IntegrationUse[];
  /** 內建種子服務：可編輯連結與功能，但不可移除 */
  builtin?: boolean;
}

export const INTEGRATION_CATEGORIES = [
  "郵件",
  "行事曆",
  "通訊",
  "電商",
  "廣告",
  "資料庫",
  "AI 模型",
  "其他",
] as const;

export const INTEGRATIONS_STORAGE_KEY = "kv-integrations-v1";

export const INTEGRATION_SEEDS: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    provider: "Google",
    category: "郵件",
    link: "https://mail.google.com",
    status: "connected",
    icon: "Mail",
    color: "#EA4335",
    uses: [
      { agent: "visit", feature: "寄送拜訪邀約與時段確認信" },
      { agent: "teamlead", feature: "每日晨報 Email 備份" },
    ],
    builtin: true,
  },
  {
    id: "google-calendar",
    name: "Google 日曆",
    provider: "Google",
    category: "行事曆",
    link: "https://calendar.google.com",
    status: "connected",
    icon: "Calendar",
    color: "#4285F4",
    uses: [
      { agent: "visit", feature: "查詢雙方空檔、建立拜訪行程" },
      { agent: "schedule", feature: "讀取今日行程並發送提醒" },
    ],
    builtin: true,
  },
  {
    id: "line-primary",
    name: "LINE OA（主頻道）",
    provider: "LINE",
    category: "通訊",
    link: "https://developers.line.biz/console/",
    status: "connected",
    icon: "MessageCircle",
    color: "#06C755",
    uses: [
      { agent: "teamlead", feature: "每日 09:00 團隊晨報推播" },
      { agent: "notify", feature: "觸發事件即時提醒" },
      { agent: "orders", feature: "新訂單與出貨通知" },
      { agent: "visit", feature: "拜訪時段確認通知" },
    ],
    builtin: true,
  },
  {
    id: "line-support",
    name: "LINE OA（客服頻道）",
    provider: "LINE",
    category: "通訊",
    link: "https://developers.line.biz/console/",
    status: "connected",
    icon: "Headset",
    color: "#06C755",
    uses: [{ agent: "support", feature: "24 小時自動回覆進線訊息" }],
    builtin: true,
  },
  {
    id: "teachify",
    name: "Teachify 開課快手",
    provider: "Teachify",
    category: "電商",
    link: "https://teachify.tw",
    status: "connected",
    icon: "ShoppingBag",
    color: "#F59E0B",
    uses: [{ agent: "orders", feature: "接收新訂單 Webhook" }],
    builtin: true,
  },
  {
    id: "supabase",
    name: "Supabase",
    provider: "Supabase",
    category: "資料庫",
    link: "https://supabase.com/dashboard",
    status: "connected",
    icon: "Database",
    color: "#3ECF8E",
    uses: [
      { agent: "teamlead", feature: "彙整全團隊活動紀錄" },
      { agent: "notify", feature: "訂閱者名單與推播對象" },
    ],
    builtin: true,
  },
  {
    id: "openai",
    name: "OpenAI API",
    provider: "OpenAI",
    category: "AI 模型",
    link: "https://platform.openai.com",
    status: "connected",
    icon: "Sparkles",
    color: "#10A37F",
    uses: [
      { agent: "report", feature: "報表洞察與行動建議生成" },
      { agent: "support", feature: "客服回覆語句生成" },
    ],
    builtin: true,
  },
  {
    id: "meta-ads",
    name: "Meta 廣告",
    provider: "Meta",
    category: "廣告",
    link: "https://business.facebook.com",
    status: "disconnected",
    note: "尚未授權，連線後由廣告 Agent 接手成效抓取",
    icon: "Megaphone",
    color: "#1877F2",
    uses: [{ agent: "today", feature: "廣告成效每日抓取（待連線）" }],
    builtin: true,
  },
];
