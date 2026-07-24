import "server-only";
import { getTrafficOverview } from "./ga4";
import { getSearchOverview } from "./gsc";
import { listWeekOverview } from "./google";
import { extractActionPlan, type MeetingAgentInput } from "./openai";

// 指揮台的「畫布」:老闆問 Ivy／Leo 要圖表、問 Milo／Coco 要行程、或問任何人要下一步
// 行動方案時,與其等 LLM 用文字硬描述,不如直接撈真實資料或整理成結構化內容,回傳
// 讓前端渲染在畫面右側的畫布面板(像 Gemini Canvas 那樣),而不是塞在對話泡泡裡的一段話。

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

export interface CalendarCanvas {
  kind: "calendar";
  title: string;
  /** 未來七天，每天的行程數（index 0 = 今天） */
  dayCounts: number[];
  upcoming: { label: string; title: string }[];
  warnings: string[];
}

export interface ActionPlanCanvas {
  kind: "action-plan";
  title: string;
  items: { label: string; detail?: string }[];
}

export type CanvasPayload = Ga4TrendCanvas | GscTrendCanvas | CalendarCanvas | ActionPlanCanvas;

const CHART_KEYWORDS = /圖表|趨勢圖|流量圖|走勢|報表|成效圖|給我圖|畫.*圖/;
const CALENDAR_KEYWORDS = /日曆|行事曆|calendar|行程表|排程狀況|這週行程|本週行程/i;
const ACTION_PLAN_KEYWORDS = /行動方案|下一步|該怎麼做|怎麼處理|建議.*做|action ?plan|待辦|todo/i;

/** 只有真的接了同一份真實日曆的 Agent 才適用行事曆畫布（比照 universe 頁的說明）。 */
const CALENDAR_AGENTS = new Set(["schedule", "visit"]);

/** 依 Agent 與這句話的意圖,best-effort 產生畫布;抓不到或用不上就回 null,不影響文字回覆。 */
export async function buildCanvasForReply(params: {
  agentSlug: string;
  message: string;
  replyText: string;
  agent: MeetingAgentInput;
}): Promise<CanvasPayload | null> {
  const { agentSlug, message, replyText, agent } = params;

  if (CHART_KEYWORDS.test(message)) {
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
  }

  if (CALENDAR_KEYWORDS.test(message) && CALENDAR_AGENTS.has(agentSlug)) {
    try {
      const o = await listWeekOverview();
      return {
        kind: "calendar",
        title: "本週行事曆（未來 7 天）",
        dayCounts: o.dayCounts,
        upcoming: o.upcoming,
        warnings: o.warnings,
      };
    } catch {
      return null;
    }
  }

  if (ACTION_PLAN_KEYWORDS.test(message)) {
    try {
      const plan = await extractActionPlan({ agent, message, replyText });
      if (!plan) return null;
      return { kind: "action-plan", title: plan.title, items: plan.items };
    } catch {
      return null;
    }
  }

  return null;
}
