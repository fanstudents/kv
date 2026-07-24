import type { AgentSlug } from "./types";
import type { KnowledgeLevel } from "./knowledge-base-data";

// 行銷戰隊的「網狀協作」與「知識庫分級治理」示範關係圖。
// 節點宇宙(universe)與劇場模式共用這一份，畫出 Agent 彼此互聯 + 底層知識庫的立體連動。
// 這是介面示範資料(展示／錄影用途)，數字與關係為示意。

// ── 1. Agent ↔ Agent 協作網 ──
// 行銷團隊不是各做各的：社群發文參考口碑情緒、廣告素材來自高互動貼文、
// 數據參謀把每一條渠道成效彙整成一張戰報。每條連線都是「資料實際流動」的方向。
export interface CollabEdge {
  from: AgentSlug;
  to: AgentSlug;
  /** 資料流動的內容(顯示在連線 tooltip / 詳情卡) */
  flow: string;
}

export const MARKETING_COLLAB_EDGES: CollabEdge[] = [
  { from: "today", to: "report", flow: "廣告 ROAS／花費成效 → 數據參謀彙整" },
  { from: "expense", to: "report", flow: "SEO 自然流量與排名 → 數據參謀彙整" },
  { from: "card", to: "report", flow: "社群互動率與觸及 → 數據參謀彙整" },
  { from: "competitor", to: "report", flow: "多平台聲量與情緒分數 → 數據參謀彙整" },
  { from: "competitor", to: "card", flow: "口碑情緒風向 → 社群調整貼文題材與語氣" },
  { from: "card", to: "today", flow: "高互動貼文 → 轉為廣告素材投放" },
  { from: "expense", to: "card", flow: "SEO 熱門選題 → 餵給社群內容發想" },
  { from: "competitor", to: "today", flow: "負評受眾／競品動向 → 廣告受眾排除與加碼" },
];

/** 某位 Agent 相連的所有協作對象(雙向) */
export function collaboratorsOf(slug: AgentSlug): AgentSlug[] {
  const set = new Set<AgentSlug>();
  for (const e of MARKETING_COLLAB_EDGES) {
    if (e.from === slug) set.add(e.to);
    if (e.to === slug) set.add(e.from);
  }
  return [...set];
}

// ── 2. 知識庫分級治理 ──
// 每位 Agent 被指派一個「可讀取上限等級」，只能讀到自己等級(含)以下的知識庫。
// 這份示範對照 /knowledge-base 頁面的分級概念(L1 公開 → L4 高敏感)。
export const AGENT_ACCESS_DEMO: Record<AgentSlug, KnowledgeLevel> = {
  teamlead: 4,
  report: 3,
  today: 3,
  competitor: 2,
  card: 2,
  expense: 2,
  visit: 3,
  schedule: 3,
  notify: 2,
  operations: 3,
  support: 2,
  orders: 3,
};

// 每一級知識庫的示範內容主題(底層資料節點),讓宇宙底層看得到「治理的是什麼」。
export interface KnowledgeDomain {
  level: KnowledgeLevel;
  topics: string[];
}

export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = [
  { level: 1, topics: ["官網文案", "產品型錄", "公開 FAQ", "品牌調性指南"] },
  { level: 2, topics: ["社群發文 SOP", "關鍵字策略庫", "廣告素材規範", "客服回覆話術"] },
  { level: 3, topics: ["客戶名單", "廣告預算與 ROAS", "報價與成效財務", "內部行銷策略"] },
  { level: 4, topics: ["個資檔案", "合約與法務", "營業秘密", "董事會簡報"] },
];
