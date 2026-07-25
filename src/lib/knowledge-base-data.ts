// 知識庫資料分級：內容依敏感度分 4 級，每位 Agent 被指派一個「可讀取上限等級」，
// 只能讀到自己等級（含）以下的知識庫文件。文件與 Agent 權限存在 Supabase
// （knowledge_base／knowledge_access 表，見 src/lib/knowledge-base.ts）；
// 這裡只放兩端（管理頁面、Agent 對話）共用的分級中繼資料與型別。

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

/** 條目型別：不是所有內容都適合寫成問答，流程要留步驟、表格要留欄位 */
export type KnowledgeKind = "faq" | "sop" | "fact" | "table" | "doc";

export const KNOWLEDGE_KIND_LABEL: Record<KnowledgeKind, string> = {
  faq: "問答",
  sop: "步驟",
  fact: "事實",
  table: "表格",
  doc: "文件",
};

/** 草稿＝AI 轉出來還沒人審，不會進 Agent 的 prompt；封存＝退場但保留可追溯 */
export type KnowledgeStatus = "draft" | "published" | "archived";

export const KNOWLEDGE_STATUS_LABEL: Record<KnowledgeStatus, string> = {
  draft: "待審",
  published: "已發布",
  archived: "已封存",
};

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  level: KnowledgeLevel;
  content?: string;
  builtin?: boolean;
  status?: KnowledgeStatus;
  kind?: KnowledgeKind;
  updatedAt?: string;
  version?: number;
  owner?: string | null;
  /** 下次複檢日：過了就該重看一次，知識會過期 */
  reviewAt?: string | null;
  /** 來源檔與頁碼——Agent 回答時可以附出處 */
  sourceDocId?: string | null;
  sourcePage?: number | null;
  meta?: Record<string, unknown>;
}
