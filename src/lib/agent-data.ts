import type { AgentActivity, AgentMeta, AgentSlug } from "./types";

// AI 生成的台灣人形象照（虛構人物，不存在於現實），存放在 public/avatars/
// 自行託管，每位 Agent 固定一張臉。
const PORTRAIT_NAMES = new Set([
  "Kevin",
  "Ivy",
  "Milo",
  "Sunny",
  "Leo",
  "Coco",
  "Dana",
  "Jay",
  "Morgan",
  "Vivian",
  "Amber",
  "Ray",
]);

export function avatarUrl(seed: string, colorHex: string) {
  if (PORTRAIT_NAMES.has(seed)) return `/avatars/${seed.toLowerCase()}.jpg`;
  // Fallback for unknown seeds: keep the previous illustrated style.
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${colorHex.replace(
    "#",
    ""
  )}`;
}

export const AGENTS: AgentMeta[] = [
  {
    slug: "teamlead",
    name: "總管 Agent",
    shortName: "總管",
    tagline: "每日晨報 + 團隊督導",
    personEn: "Vivian",
    personZh: "薇薇安",
    role: "Team Lead 大總管",
    description:
      "統管所有 AI 隊友的大總管，每天彙整過去 24 小時每位成員完成的工作、遇到的異常與待辦事項，主動透過 LINE 向您匯報團隊摘要。",
    color: "#475569",
    status: "active",
    metrics: [
      { label: "管理成員", value: "9 位" },
      { label: "每日匯報", value: "09:00" },
    ],
    lastRun: "運作中",
    recipients: 1,
  },
  {
    slug: "notify",
    name: "通知 Agent",
    shortName: "通知",
    tagline: "跳出提醒通知",
    personEn: "Kevin",
    personZh: "凱文",
    role: "即時監控員",
    description:
      "監控指定指標或事件，一旦觸發條件成立，立即透過 LINE 推播提醒通知給指定對象。",
    color: "#06C755",
    status: "active",
    metrics: [
      { label: "本月觸發次數", value: "128", delta: "+12%" },
      { label: "平均回應時間", value: "3.2 分" },
    ],
    lastRun: "2026-07-16 09:12",
    recipients: 24,
  },
  {
    slug: "report",
    name: "數據 Agent",
    shortName: "數據",
    tagline: "成效數據彙整與洞察",
    personEn: "Ivy",
    personZh: "艾薇",
    role: "數據參謀",
    description:
      "彙整各行銷渠道的成效數據（流量、轉換、ROAS 等），定期產出洞察報表並附上 AI 行動建議，推播到 LINE。",
    color: "#3B82F6",
    status: "active",
    metrics: [
      { label: "本月報表數", value: "4" },
      { label: "整體轉換率", value: "34.7%", delta: "+6%" },
    ],
    lastRun: "2026-07-13 15:49",
    recipients: 9,
  },
  {
    slug: "schedule",
    name: "行程 Agent",
    shortName: "行程",
    tagline: "行事曆預約",
    personEn: "Milo",
    personZh: "米樂",
    role: "行程助理",
    description:
      "串接行事曆，協助處理預約、提醒與改期，並自動發送確認訊息給對方。",
    color: "#8B5CF6",
    status: "active",
    metrics: [
      { label: "本月預約數", value: "56" },
      { label: "準時出席率", value: "91%" },
    ],
    lastRun: "2026-07-15 18:04",
    recipients: 42,
  },
  {
    slug: "card",
    name: "社群 Agent",
    shortName: "社群",
    tagline: "社群貼文發想與排程",
    personEn: "Sunny",
    personZh: "陽陽",
    role: "社群操盤手",
    description:
      "依品牌調性發想各社群平台的貼文與圖文素材，安排發文排程，並彙整互動成效供調整內容方向。",
    color: "#8B5CF6",
    status: "active",
    metrics: [
      { label: "本月貼文數", value: "0" },
      { label: "平均互動率", value: "—" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "expense",
    name: "SEO Agent",
    shortName: "SEO",
    tagline: "關鍵字追蹤與內容優化建議",
    personEn: "Leo",
    personZh: "立歐",
    role: "SEO 尖兵",
    description:
      "追蹤網站在搜尋引擎的關鍵字排名與自然流量，找出優化機會，提供內容與技術面的 SEO 改善建議。",
    color: "#14B8A6",
    status: "active",
    metrics: [
      { label: "追蹤關鍵字", value: "0" },
      { label: "自然流量變化", value: "—" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "visit",
    name: "約拜訪 Agent",
    shortName: "約拜訪",
    tagline: "名片／Email 辨識 + 自動邀約",
    personEn: "Coco",
    personZh: "可可",
    role: "商務邀約專員",
    description:
      "收到您傳來的名片圖片或轉寄 Email 後，比對您的行事曆空檔，挑選未來幾天內的時段，主動寄信邀約對方見面。",
    color: "#0EA5E9",
    status: "active",
    metrics: [
      { label: "本月邀約數", value: "0" },
      { label: "對方回覆率", value: "—" },
    ],
    lastRun: "運作中",
    recipients: 1,
  },
  {
    slug: "today",
    name: "廣告 Agent",
    shortName: "廣告",
    tagline: "廣告投放監控與成效優化",
    personEn: "Dana",
    personZh: "丹娜",
    role: "AI 廣告投手",
    description:
      "監控 Meta、Google 等平台的廣告投放成效（花費、CPA、ROAS），發現異常主動提醒，並提供預算與素材的調整建議。",
    color: "#EF4444",
    status: "active",
    metrics: [
      { label: "本月廣告花費", value: "—" },
      { label: "整體 ROAS", value: "—" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "competitor",
    name: "口碑 Agent",
    shortName: "口碑",
    tagline: "品牌口碑與聲量監測",
    personEn: "Jay",
    personZh: "杰宇",
    role: "輿情哨兵",
    description:
      "追蹤品牌在社群、論壇、新聞與評論平台的提及與情緒，為每則聲量標籤分類與情緒分級，標出需要即時回應的負面口碑。",
    color: "#D946EF",
    status: "active",
    metrics: [
      { label: "本月監測聲量", value: "0" },
      { label: "需回應負評", value: "0" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "operations",
    name: "營運 Agent",
    shortName: "營運",
    tagline: "產品線儀表板",
    personEn: "Morgan",
    personZh: "摩根",
    role: "營運總管",
    description:
      "彙整企業內訓、公開課程、AI 導入、一對一陪跑與其他專案等各產品線的狀態與下一步，一眼掌握公司營運全貌。",
    color: "#F97316",
    status: "active",
    metrics: [
      { label: "進行中專案", value: "0" },
      { label: "本週更新", value: "0" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "support",
    name: "客服 Agent",
    shortName: "客服",
    tagline: "第二支 LINE OA 客服接待",
    personEn: "Amber",
    personZh: "安柏",
    role: "客服接待專員",
    description:
      "駐守在獨立的客服官方帳號，接收客戶訊息並自動回覆、記錄每一則對話，讓真人客服可以快速接手。",
    color: "#EC4899",
    status: "draft",
    metrics: [
      { label: "本月接待數", value: "0" },
      { label: "平均回覆時間", value: "—" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "orders",
    name: "訂單 Agent",
    shortName: "訂單",
    tagline: "Teachify 訂單即時通知",
    personEn: "Ray",
    personZh: "睿哲",
    role: "訂單值班員",
    description:
      "監看 Teachify 網站的訂單 Webhook，只要有新訂單成立或退款，立即透過 LINE 通知您金額與品項明細。",
    color: "#F59E0B",
    status: "draft",
    metrics: [
      { label: "本月訂單數", value: "0" },
      { label: "本月營收", value: "—" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
];

export function getAgent(slug: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

// 團隊分組：行銷 Team 由這幾個 slug 組成，其餘歸行政 Team。
export const MARKETING_SLUGS: AgentSlug[] = ["today", "expense", "card", "report", "competitor"];

export function agentTeam(slug: string): "marketing" | "admin" {
  return (MARKETING_SLUGS as string[]).includes(slug) ? "marketing" : "admin";
}

export const ACTIVITY_LOGS: Record<AgentSlug, AgentActivity[]> = {
  teamlead: [
    { id: "tl1", timestamp: "尚未匯報", summary: "大總管已就任，等待第一次每日匯報", status: "pending" },
  ],
  notify: [
    { id: "n1", timestamp: "2026-07-16 09:12", summary: "問卷完成率低於 65%，已通知行銷群組", status: "success" },
    { id: "n2", timestamp: "2026-07-15 14:30", summary: "訂單超過 24 小時未完成付款，已提醒承辦人", status: "success" },
    { id: "n3", timestamp: "2026-07-14 08:00", summary: "行事曆提醒推播失敗（LINE API 逾時）", status: "failed" },
  ],
  report: [
    { id: "r1", timestamp: "尚未啟用", summary: "等待串接 GA4／廣告平台等成效數據來源", status: "pending" },
  ],
  schedule: [
    { id: "s1", timestamp: "2026-07-15 18:04", summary: "已為客戶「王小明」確認 7/18 14:00 諮詢預約", status: "success" },
    { id: "s2", timestamp: "2026-07-15 10:12", summary: "偵測到行程衝突，已建議改期選項", status: "pending" },
    { id: "s3", timestamp: "2026-07-14 09:30", summary: "會議前 30 分鐘提醒已發送", status: "success" },
  ],
  card: [
    { id: "c1", timestamp: "尚未啟用", summary: "等待串接社群平台，開始發想與排程貼文", status: "pending" },
  ],
  expense: [
    { id: "e1", timestamp: "尚未啟用", summary: "等待串接 Search Console，開始追蹤關鍵字排名", status: "pending" },
  ],
  visit: [
    { id: "v1", timestamp: "尚未啟用", summary: "此 Agent 目前為草稿狀態，尚未開始運作", status: "pending" },
  ],
  today: [
    { id: "t1", timestamp: "尚未啟用", summary: "等待串接 Meta／Google 廣告帳號，開始監控投放成效", status: "pending" },
  ],
  competitor: [
    { id: "co1", timestamp: "尚未啟用", summary: "等待設定監測關鍵字，開始追蹤品牌聲量與口碑", status: "pending" },
  ],
  operations: [
    { id: "op1", timestamp: "尚未啟用", summary: "營運儀表板已建立，尚待填入各產品線現況", status: "pending" },
  ],
  support: [
    { id: "sup1", timestamp: "尚未啟用", summary: "等待接上第二支客服官方帳號的 Channel 金鑰", status: "pending" },
  ],
  orders: [
    { id: "ord1", timestamp: "尚未啟用", summary: "等待 Teachify 訂單 Webhook 設定完成", status: "pending" },
  ],
};
