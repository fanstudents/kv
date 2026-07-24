import { buildSearchDemo } from "./gsc-demo";
import { buildTrafficDemo } from "./ga4-demo";
import { ADS_DEMO_STATS } from "./ads-demo";
import { SOCIAL_DEMO_STATS } from "./social-demo";
import { REPUTATION_DEMO_STATS } from "./reputation-demo";
import type { AgentSlug } from "./types";

// 「幫每位 Agent 設定目標」的型錄與計算。
//
// 目標＝「某個資料來源的某個指標，在某個期限前達到某個數字」——例如
// SEO Agent（Leo）的 GSC 自然搜尋點擊量，在 8/31 前達成 1,000 次。
// 指標型錄（GOAL_METRICS）把每種可設定的目標類型定義清楚：資料從哪來、單位是什麼、
// 是越高越好還是越低越好、預設由誰負責，設定介面才能讓人「選類型」而不是自己編欄位。
//
// 目前值（current）取自各 Agent 頁面正在用的同一份示範資料來源（GSC／GA4／廣告／社群／口碑），
// 所以總覽上的達成率跟各 Agent 頁面的數字是一致的；真實串接接上後，只要換掉 currentOf 即可。

export type GoalDirection = "up" | "down";

export type GoalUnit =
  | "count" // 次數／筆數
  | "percent" // 百分比
  | "currency" // 新台幣
  | "ratio" // 倍數（ROAS）
  | "minutes" // 分鐘
  | "position" // 搜尋排名（越小越好）
  | "score"; // 0-100 分數

export type GoalCategory = "流量成效" | "廣告投放" | "社群互動" | "口碑聲量" | "營運業績" | "服務效率";

export interface GoalMetric {
  id: string;
  /** 指標名稱（設定介面的選項標題） */
  label: string;
  /** 資料來源（真實串接時實際取數的地方） */
  source: string;
  /** BrandLogo 的品牌 key（沒有對應 logo 時退回色塊縮寫） */
  brand?: string;
  category: GoalCategory;
  unit: GoalUnit;
  direction: GoalDirection;
  /** 一句話說明這個目標在衡量什麼 */
  hint: string;
  /** 建議負責的 Agent（設定介面會優先列出這位的相關指標） */
  agents: AgentSlug[];
  /** 新增時預填的目標值 */
  defaultTarget: number;
  /** 目前實際值 */
  current: number;
}

const gsc = buildSearchDemo(28);
const ga4 = buildTrafficDemo(28);

export const GOAL_METRICS: GoalMetric[] = [
  // ── 流量成效（SEO／GA4）──
  {
    id: "gsc-clicks",
    label: "自然搜尋點擊量",
    source: "Google Search Console",
    brand: "google-search-console",
    category: "流量成效",
    unit: "count",
    direction: "up",
    hint: "使用者從 Google 搜尋結果點進網站的總次數",
    agents: ["expense", "report"],
    defaultTarget: 2600,
    current: gsc.totalClicks,
  },
  {
    id: "gsc-impressions",
    label: "搜尋曝光數",
    source: "Google Search Console",
    brand: "google-search-console",
    category: "流量成效",
    unit: "count",
    direction: "up",
    hint: "網站在搜尋結果被看見的總次數，衡量能見度",
    agents: ["expense"],
    defaultTarget: 60000,
    current: gsc.totalImpressions,
  },
  {
    id: "gsc-position",
    label: "關鍵字平均排名",
    source: "Google Search Console",
    brand: "google-search-console",
    category: "流量成效",
    unit: "position",
    direction: "down",
    hint: "追蹤關鍵字的平均排名，數字越小越前面",
    agents: ["expense"],
    defaultTarget: 4,
    current: Number(gsc.avgPosition.toFixed(1)),
  },
  {
    id: "gsc-top10",
    label: "進前十關鍵字數",
    source: "Google Search Console",
    brand: "google-search-console",
    category: "流量成效",
    unit: "count",
    direction: "up",
    hint: "平均排名進到第一頁（前十名）的關鍵字組數",
    agents: ["expense"],
    defaultTarget: 12,
    current: gsc.topQueries.filter((q) => q.position <= 10).length,
  },
  {
    id: "ga4-sessions",
    label: "網站工作階段",
    source: "Google Analytics 4",
    brand: "google-analytics",
    category: "流量成效",
    unit: "count",
    direction: "up",
    hint: "全站各渠道進站的工作階段總數",
    agents: ["report"],
    defaultTarget: 40000,
    current: ga4.sessions,
  },
  {
    id: "ga4-conversions",
    label: "網站轉換數",
    source: "Google Analytics 4",
    brand: "google-analytics",
    category: "流量成效",
    unit: "count",
    direction: "up",
    hint: "完成關鍵事件（表單、購買、報名）的次數",
    agents: ["report", "today"],
    defaultTarget: 1500,
    current: ga4.conversions,
  },

  // ── 廣告投放 ──
  {
    id: "ads-roas",
    label: "廣告 ROAS",
    source: "Meta／Google Ads",
    brand: "meta",
    category: "廣告投放",
    unit: "ratio",
    direction: "up",
    hint: "廣告花一塊錢帶回多少營收，越高越好",
    agents: ["today", "report"],
    defaultTarget: 4,
    current: ADS_DEMO_STATS.roas,
  },
  {
    id: "ads-cpa",
    label: "每筆轉換成本 CPA",
    source: "Meta／Google Ads",
    brand: "meta",
    category: "廣告投放",
    unit: "currency",
    direction: "down",
    hint: "取得一筆轉換的平均花費，越低越好",
    agents: ["today"],
    defaultTarget: 250,
    current: ADS_DEMO_STATS.cpa,
  },
  {
    id: "ads-spend",
    label: "廣告預算執行",
    source: "Meta／Google Ads",
    brand: "meta",
    category: "廣告投放",
    unit: "currency",
    direction: "up",
    hint: "期間內的廣告總花費，用來盯預算執行率",
    agents: ["today"],
    defaultTarget: 120000,
    current: ADS_DEMO_STATS.spend,
  },
  {
    id: "ads-ctr",
    label: "廣告點擊率 CTR",
    source: "Meta／Google Ads",
    brand: "meta",
    category: "廣告投放",
    unit: "percent",
    direction: "up",
    hint: "素材被點擊的比例，衡量素材吸引力",
    agents: ["today"],
    defaultTarget: 3,
    current: ADS_DEMO_STATS.ctr,
  },

  // ── 社群互動 ──
  {
    id: "social-engagement",
    label: "社群平均互動率",
    source: "Instagram／Facebook／Threads",
    category: "社群互動",
    unit: "percent",
    direction: "up",
    hint: "貼文互動數 ÷ 觸及，衡量內容有沒有打中人",
    agents: ["card"],
    defaultTarget: 8,
    current: SOCIAL_DEMO_STATS.avgEngagement,
  },
  {
    id: "social-posts",
    label: "貼文產出數",
    source: "社群排程",
    category: "社群互動",
    unit: "count",
    direction: "up",
    hint: "期間內實際發佈的貼文則數",
    agents: ["card"],
    defaultTarget: 24,
    current: SOCIAL_DEMO_STATS.posts,
  },
  {
    id: "social-reach",
    label: "社群總觸及",
    source: "Instagram／Facebook／Threads",
    category: "社群互動",
    unit: "count",
    direction: "up",
    hint: "所有貼文觸及的不重複人數總和",
    agents: ["card", "report"],
    defaultTarget: 80000,
    current: SOCIAL_DEMO_STATS.totalReach,
  },
  {
    id: "social-followers",
    label: "粉絲淨成長",
    source: "社群平台",
    category: "社群互動",
    unit: "count",
    direction: "up",
    hint: "期間內新增減去流失的粉絲數",
    agents: ["card"],
    defaultTarget: 2000,
    current: SOCIAL_DEMO_STATS.followerGrowth,
  },

  // ── 口碑聲量 ──
  {
    id: "reputation-score",
    label: "品牌情緒分數",
    source: "社群／論壇／評論監測",
    category: "口碑聲量",
    unit: "score",
    direction: "up",
    hint: "所有聲量的綜合情緒溫度（0-100）",
    agents: ["competitor"],
    defaultTarget: 85,
    current: REPUTATION_DEMO_STATS.sentimentScore,
  },
  {
    id: "reputation-mentions",
    label: "品牌聲量則數",
    source: "社群／論壇／評論監測",
    category: "口碑聲量",
    unit: "count",
    direction: "up",
    hint: "被提及的總則數，衡量討論熱度",
    agents: ["competitor"],
    defaultTarget: 1500,
    current: REPUTATION_DEMO_STATS.totalMentions,
  },
  {
    id: "reputation-negative",
    label: "待處理負評數",
    source: "社群／論壇／評論監測",
    category: "口碑聲量",
    unit: "count",
    direction: "down",
    hint: "尚未回應的負面聲量，越少越好",
    agents: ["competitor", "support"],
    defaultTarget: 0,
    current: REPUTATION_DEMO_STATS.pendingNegative,
  },

  // ── 營運業績 ──
  {
    id: "orders-revenue",
    label: "訂單營收",
    source: "Teachify 訂單 Webhook",
    category: "營運業績",
    unit: "currency",
    direction: "up",
    hint: "期間內成立訂單的營收總額",
    agents: ["orders", "operations"],
    defaultTarget: 500000,
    current: 328500,
  },
  {
    id: "orders-count",
    label: "成立訂單數",
    source: "Teachify 訂單 Webhook",
    category: "營運業績",
    unit: "count",
    direction: "up",
    hint: "期間內完成付款的訂單筆數",
    agents: ["orders"],
    defaultTarget: 180,
    current: 124,
  },
  {
    id: "visit-meetings",
    label: "成約拜訪場次",
    source: "邀約信＋Google 日曆",
    brand: "google-calendar",
    category: "營運業績",
    unit: "count",
    direction: "up",
    hint: "實際排進行事曆的客戶拜訪場次",
    agents: ["visit"],
    defaultTarget: 20,
    current: 13,
  },
  {
    id: "visit-reply-rate",
    label: "邀約回覆率",
    source: "Gmail 追蹤",
    brand: "gmail",
    category: "營運業績",
    unit: "percent",
    direction: "up",
    hint: "寄出的邀約信中收到回覆的比例",
    agents: ["visit"],
    defaultTarget: 60,
    current: 48,
  },
  {
    id: "ops-knowledge",
    label: "知識庫新增條目",
    source: "知識庫",
    brand: "supabase",
    category: "營運業績",
    unit: "count",
    direction: "up",
    hint: "期間內補進知識庫的問答／文件數",
    agents: ["operations"],
    defaultTarget: 40,
    current: 26,
  },

  // ── 服務效率 ──
  {
    id: "support-response",
    label: "客服平均回覆時間",
    source: "LINE 客服官方帳號",
    brand: "line",
    category: "服務效率",
    unit: "minutes",
    direction: "down",
    hint: "客戶進線到第一則回覆的平均分鐘數",
    agents: ["support", "notify"],
    defaultTarget: 3,
    current: 6.4,
  },
  {
    id: "support-resolved",
    label: "自動結案率",
    source: "LINE 客服官方帳號",
    brand: "line",
    category: "服務效率",
    unit: "percent",
    direction: "up",
    hint: "不用轉真人就處理完的對話比例",
    agents: ["support"],
    defaultTarget: 70,
    current: 52,
  },
  {
    id: "notify-ontime",
    label: "推播準時率",
    source: "LINE Messaging API",
    brand: "line",
    category: "服務效率",
    unit: "percent",
    direction: "up",
    hint: "在門檻時間內成功送達的推播比例",
    agents: ["notify", "teamlead"],
    defaultTarget: 99,
    current: 96.5,
  },
  {
    id: "schedule-ontime",
    label: "行程準時出席率",
    source: "Google 日曆",
    brand: "google-calendar",
    category: "服務效率",
    unit: "percent",
    direction: "up",
    hint: "已排定會議中準時出席的比例",
    agents: ["schedule"],
    defaultTarget: 95,
    current: 91,
  },
  {
    id: "teamlead-tasks",
    label: "團隊完成任務數",
    source: "團隊活動紀錄",
    category: "服務效率",
    unit: "count",
    direction: "up",
    hint: "全隊在期間內完成的任務總數",
    agents: ["teamlead"],
    defaultTarget: 800,
    current: 604,
  },
];

export const GOAL_CATEGORIES: GoalCategory[] = [
  "流量成效",
  "廣告投放",
  "社群互動",
  "口碑聲量",
  "營運業績",
  "服務效率",
];

export function metricOf(metricId: string): GoalMetric | undefined {
  return GOAL_METRICS.find((m) => m.id === metricId);
}

/** 這位 Agent 適合設定的指標（建議在前，其餘同類型墊後） */
export function metricsForAgent(slug: AgentSlug): GoalMetric[] {
  const own = GOAL_METRICS.filter((m) => m.agents.includes(slug));
  const rest = GOAL_METRICS.filter((m) => !m.agents.includes(slug));
  return [...own, ...rest];
}

export type GoalCadence = "once" | "weekly" | "monthly" | "quarterly";

export const CADENCE_LABEL: Record<GoalCadence, string> = {
  once: "單次挑戰",
  weekly: "每週循環",
  monthly: "每月循環",
  quarterly: "每季循環",
};

export interface AgentGoal {
  id: string;
  agentSlug: AgentSlug;
  metricId: string;
  /** 目標值 */
  target: number;
  /** 設定當下的起始值（算進度的基準；越低越好的指標一定要有） */
  startValue: number;
  /** 起算日（YYYY-MM-DD） */
  startDate: string;
  /** 期限（YYYY-MM-DD） */
  dueDate: string;
  cadence: GoalCadence;
  note?: string;
}

export type GoalStatus = "achieved" | "on-track" | "at-risk" | "behind" | "expired";

export const GOAL_STATUS_META: Record<GoalStatus, { label: string; color: string; tone: string }> = {
  achieved: { label: "已達標", color: "#06C755", tone: "bg-[#06C755]/12 text-[#06C755]" },
  "on-track": { label: "進度超前", color: "#3B82F6", tone: "bg-blue-500/12 text-blue-500" },
  "at-risk": { label: "需要加把勁", color: "#F59E0B", tone: "bg-amber-500/12 text-amber-500" },
  behind: { label: "落後", color: "#EF4444", tone: "bg-red-500/12 text-red-500" },
  expired: { label: "已逾期", color: "#71717A", tone: "bg-neutral-500/12 text-neutral-500" },
};

export interface GoalProgress {
  metric: GoalMetric;
  current: number;
  /** 達成率 0-1（可超過 1，畫面上自行 clamp） */
  ratio: number;
  /** 期間已經過的比例 0-1 */
  timeRatio: number;
  /** 距離期限剩幾天（負數＝已逾期） */
  daysLeft: number;
  status: GoalStatus;
  /** 還差多少才達標（已達標為 0） */
  remaining: number;
}

const DAY = 86_400_000;

/** 以「今天」為基準計算一筆目標的達成率與健康度。
 * 時間一律用 UTC 的「日」為最小刻度（而不是當下的毫秒）：伺服器端與瀏覽器端算出來的
 * 進度才會完全一樣，不會因為差幾毫秒就觸發 hydration mismatch 警告。 */
export function goalProgress(goal: AgentGoal, today = new Date()): GoalProgress | null {
  const metric = metricOf(goal.metricId);
  if (!metric) return null;

  const current = metric.current;
  const span =
    metric.direction === "up" ? goal.target - goal.startValue : goal.startValue - goal.target;
  const gained = metric.direction === "up" ? current - goal.startValue : goal.startValue - current;
  const ratio = span === 0 ? (gained >= 0 ? 1 : 0) : gained / span;

  const start = Date.parse(`${goal.startDate}T00:00:00Z`);
  const due = Date.parse(`${goal.dueDate}T00:00:00Z`) + DAY - 1;
  const now = Math.floor(today.getTime() / DAY) * DAY;
  const timeRatio = due <= start ? 1 : Math.min(1, Math.max(0, (now - start) / (due - start)));
  const daysLeft = Math.ceil((due - now) / DAY);

  const remaining =
    ratio >= 1 ? 0 : metric.direction === "up" ? goal.target - current : current - goal.target;

  let status: GoalStatus;
  if (ratio >= 1) status = "achieved";
  else if (daysLeft < 0) status = "expired";
  else if (ratio >= timeRatio - 0.05) status = "on-track";
  else if (ratio >= timeRatio - 0.2) status = "at-risk";
  else status = "behind";

  return { metric, current, ratio, timeRatio, daysLeft, status, remaining: Math.max(0, remaining) };
}

/** 指標數值的顯示格式（單位不同，寫法也不同） */
export function formatGoalValue(unit: GoalUnit, value: number): string {
  const round = (n: number, d = 0) =>
    n.toLocaleString("zh-TW", { minimumFractionDigits: d, maximumFractionDigits: d });
  switch (unit) {
    case "currency":
      return `NT$ ${round(Math.round(value))}`;
    case "percent":
      return `${round(value, value % 1 === 0 ? 0 : 1)}%`;
    case "ratio":
      return `${round(value, 1)}x`;
    case "minutes":
      return `${round(value, value % 1 === 0 ? 0 : 1)} 分`;
    case "position":
      return `第 ${round(value, 1)} 名`;
    case "score":
      return `${round(value, 0)} 分`;
    default:
      return round(Math.round(value));
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 依循環週期推算預設期限（設定介面選了「每月循環」就自動帶月底） */
export function defaultDueDate(cadence: GoalCadence, from = new Date()): string {
  const d = new Date(from);
  if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cadence === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setDate(d.getDate() + 30);
  return isoDate(d);
}

// 示範用的預設目標：每位 Agent 都先有一到兩個目標，總覽一打開就看得到全隊的達成率分佈。
// 使用者自己新增／修改後會存進 localStorage（見 agent-goals-store.ts），這份只當種子。
function seed(
  agentSlug: AgentSlug,
  metricId: string,
  target: number,
  startValue: number,
  startDate: string,
  dueDate: string,
  cadence: GoalCadence,
  note?: string
): AgentGoal {
  return { id: `seed-${agentSlug}-${metricId}`, agentSlug, metricId, target, startValue, startDate, dueDate, cadence, note };
}

export const DEFAULT_GOALS: AgentGoal[] = [
  seed("expense", "gsc-clicks", 2600, 0, "2026-07-01", "2026-08-31", "monthly", "比較型內容主打「AI 行銷 agent」字群"),
  seed("expense", "gsc-position", 4, 6.2, "2026-07-01", "2026-09-30", "quarterly"),
  seed("report", "ga4-conversions", 1500, 0, "2026-07-01", "2026-07-31", "monthly", "以官網表單與課程報名為主要轉換"),
  seed("today", "ads-roas", 4, 3.1, "2026-07-01", "2026-08-15", "monthly", "先砍疲勞受眾再談加碼"),
  seed("today", "ads-cpa", 250, 340, "2026-07-01", "2026-08-15", "monthly"),
  seed("card", "social-engagement", 8, 5.4, "2026-07-01", "2026-08-31", "monthly", "放大高互動題材"),
  seed("card", "social-posts", 24, 0, "2026-07-01", "2026-07-31", "monthly"),
  seed("competitor", "reputation-score", 85, 74, "2026-07-01", "2026-09-30", "quarterly"),
  seed("competitor", "reputation-negative", 0, 8, "2026-07-01", "2026-08-31", "monthly", "負評 24 小時內一定要回"),
  seed("visit", "visit-meetings", 20, 0, "2026-07-01", "2026-08-31", "monthly"),
  seed("orders", "orders-revenue", 500000, 0, "2026-07-01", "2026-09-30", "quarterly"),
  seed("support", "support-response", 3, 9, "2026-07-01", "2026-08-31", "monthly", "接上客服官方帳號後開始計算"),
  seed("schedule", "schedule-ontime", 95, 88, "2026-07-01", "2026-09-30", "quarterly"),
  seed("notify", "notify-ontime", 99, 94, "2026-07-01", "2026-08-31", "monthly"),
  seed("operations", "ops-knowledge", 40, 0, "2026-07-01", "2026-08-31", "monthly"),
  seed("teamlead", "teamlead-tasks", 800, 0, "2026-07-01", "2026-07-31", "monthly", "全隊任務量的節奏基準"),
];
