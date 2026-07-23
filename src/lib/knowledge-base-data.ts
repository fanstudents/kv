import type { AgentSlug } from "./types";

// 知識庫資料分級示範：內容依敏感度分 4 級，每位 Agent 被指派一個「可讀取上限等級」，
// 只能讀到自己等級（含）以下的知識庫文件。異動存於瀏覽器 localStorage（介面示範，未接後端)。

export type KnowledgeLevel = 1 | 2 | 3 | 4;

export interface KnowledgeLevelInfo {
  level: KnowledgeLevel;
  label: string;
  dataTypes: string;
  aiUsage: string;
  color: string;
}

export const KNOWLEDGE_LEVELS: KnowledgeLevelInfo[] = [
  {
    level: 1,
    label: "L1 公開資料",
    dataTypes: "官網、型錄、FAQ、公開簡報",
    aiUsage: "可用一般 AI / SaaS",
    color: "#06C755",
  },
  {
    level: 2,
    label: "L2 內部資料",
    dataTypes: "SOP、教育訓練、一般文件",
    aiUsage: "可用企業版 AI 或私有知識庫",
    color: "#3B82F6",
  },
  {
    level: 3,
    label: "L3 敏感資料",
    dataTypes: "客戶資料、合約、報價、財務、內部策略",
    aiUsage: "建議私有雲或內部部署",
    color: "#F59E0B",
  },
  {
    level: 4,
    label: "L4 高敏感資料",
    dataTypes: "個資、醫療、法務、機密研發、營業秘密",
    aiUsage: "原則上不直接丟給外部模型，需嚴格控管",
    color: "#EF4444",
  },
];

export function levelInfo(level: KnowledgeLevel): KnowledgeLevelInfo {
  return KNOWLEDGE_LEVELS[level - 1];
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  level: KnowledgeLevel;
  note?: string;
  builtin?: boolean;
}

export const KNOWLEDGE_STORAGE_KEY = "kv-knowledge-base-v1";
export const KNOWLEDGE_ACCESS_STORAGE_KEY = "kv-knowledge-access-v1";

export const KNOWLEDGE_SEEDS: KnowledgeDoc[] = [
  { id: "kb-website", title: "官網服務介紹", category: "官網／型錄", level: 1, builtin: true },
  { id: "kb-catalog", title: "產品／課程型錄 PDF", category: "官網／型錄", level: 1, builtin: true },
  { id: "kb-faq", title: "常見問題 FAQ", category: "FAQ", level: 1, builtin: true },
  { id: "kb-support-sop", title: "客服應答 SOP", category: "SOP", level: 2, builtin: true },
  { id: "kb-onboarding", title: "新人教育訓練手冊", category: "教育訓練", level: 2, builtin: true },
  { id: "kb-content-cal", title: "內容行事曆與品牌調性規範", category: "一般文件", level: 2, builtin: true },
  { id: "kb-customers", title: "客戶名單與聯絡資訊", category: "客戶資料", level: 3, builtin: true },
  { id: "kb-contracts", title: "合約與報價範本", category: "合約／報價", level: 3, builtin: true },
  { id: "kb-finance", title: "財務月報", category: "財務", level: 3, builtin: true },
  { id: "kb-pii", title: "員工個資與勞健保紀錄", category: "個資", level: 4, builtin: true },
  { id: "kb-legal", title: "併購案法務合約（洽談中）", category: "法務", level: 4, builtin: true },
  { id: "kb-rd", title: "未公開課程研發教材", category: "機密研發", level: 4, builtin: true },
];

// 每位 Agent 的可讀取上限等級（含以下等級）：依角色的業務需要指派，
// L4 預設只有總管可讀，呼應「原則上不直接丟給外部模型」的建議。
export const AGENT_ACCESS_SEEDS: Record<AgentSlug, KnowledgeLevel> = {
  teamlead: 4,
  notify: 2,
  report: 3,
  schedule: 2,
  card: 1,
  expense: 1,
  visit: 3,
  today: 2,
  competitor: 1,
  operations: 3,
  support: 3,
  orders: 3,
};
