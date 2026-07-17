import type { AgentActivity, AgentMeta, AgentSlug } from "./types";

// AI 生成的台灣人形象照（虛構人物，不存在於現實），存放在 public/avatars/
// 自行託管，每位 Agent 固定一張臉。
const PORTRAIT_NAMES = new Set(["Kevin", "Ivy", "Milo", "Sunny", "Leo", "Coco", "Dana", "Jay", "Morgan"]);

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
    name: "報表 Agent",
    shortName: "報表",
    tagline: "定期寄送報表",
    personEn: "Ivy",
    personZh: "艾薇",
    role: "數據分析師",
    description:
      "依排程自動彙整關鍵指標，產出報表並附上 AI 行動建議，定時推播至 LINE 群組或個人。",
    color: "#2F7DE1",
    status: "active",
    metrics: [
      { label: "本月報表數", value: "4" },
      { label: "訂閱轉換率", value: "34.7%", delta: "+6%" },
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
    name: "名片 Agent",
    shortName: "名片",
    tagline: "名片掃描、發會後信",
    personEn: "Sunny",
    personZh: "陽陽",
    role: "人脈公關",
    description:
      "掃描名片自動辨識聯絡資訊，建立聯絡人並於會後自動寄送跟進信件。",
    color: "#F59E0B",
    status: "paused",
    metrics: [
      { label: "本月掃描數", value: "31" },
      { label: "會後信寄出率", value: "88%" },
    ],
    lastRun: "2026-07-10 11:20",
    recipients: 31,
  },
  {
    slug: "expense",
    name: "報帳 Agent",
    shortName: "報帳",
    tagline: "發票掃描歸檔",
    personEn: "Leo",
    personZh: "立歐",
    role: "財務小尖兵",
    description:
      "自動辨識發票內容並歸檔至指定表單或系統，並於每月截止前提醒尚未報帳項目。",
    color: "#EF4444",
    status: "draft",
    metrics: [
      { label: "本月歸檔數", value: "0" },
      { label: "待審核", value: "0" },
    ],
    lastRun: "尚未啟用",
    recipients: 6,
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
    status: "draft",
    metrics: [
      { label: "本月邀約數", value: "0" },
      { label: "對方回覆率", value: "—" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "today",
    name: "今日完成 Agent",
    shortName: "今日完成",
    tagline: "客戶待辦彙整 + 逾期提醒",
    personEn: "Dana",
    personZh: "丹娜",
    role: "客服跟進專員",
    description:
      "整合最近兩天內兩個 Gmail 信箱與「數位簡報室」LINE 官方帳號的客戶待辦事項，自動判斷完成狀態，若對方遲遲無回應則主動提醒。",
    color: "#14B8A6",
    status: "draft",
    metrics: [
      { label: "追蹤中待辦", value: "0" },
      { label: "逾期未回應", value: "0" },
    ],
    lastRun: "尚未啟用",
    recipients: 1,
  },
  {
    slug: "competitor",
    name: "競爭對手 Agent",
    shortName: "競爭對手",
    tagline: "對手情報蒐集 + 影響分級",
    personEn: "Jay",
    personZh: "杰宇",
    role: "市場情報官",
    description:
      "追蹤您指定的競爭對手官網、新聞報導、徵才資訊與產品口碑，為每則情報標籤分類，標出對公司有影響、需要展開行動的訊息。",
    color: "#D946EF",
    status: "draft",
    metrics: [
      { label: "本月蒐集情報", value: "0" },
      { label: "需展開行動", value: "0" },
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
];

export function getAgent(slug: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export const ACTIVITY_LOGS: Record<AgentSlug, AgentActivity[]> = {
  notify: [
    { id: "n1", timestamp: "2026-07-16 09:12", summary: "問卷完成率低於 65%，已通知行銷群組", status: "success" },
    { id: "n2", timestamp: "2026-07-15 14:30", summary: "訂單超過 24 小時未完成付款，已提醒承辦人", status: "success" },
    { id: "n3", timestamp: "2026-07-14 08:00", summary: "行事曆提醒推播失敗（LINE API 逾時）", status: "failed" },
  ],
  report: [
    { id: "r1", timestamp: "2026-07-13 15:49", summary: "本月訂閱轉換月報已寄出至「行銷團隊」群組", status: "success" },
    { id: "r2", timestamp: "2026-07-06 09:00", summary: "週報已寄出，問卷完成率 63.5%", status: "success" },
    { id: "r3", timestamp: "2026-06-29 09:00", summary: "週報已寄出", status: "success" },
  ],
  schedule: [
    { id: "s1", timestamp: "2026-07-15 18:04", summary: "已為客戶「王小明」確認 7/18 14:00 諮詢預約", status: "success" },
    { id: "s2", timestamp: "2026-07-15 10:12", summary: "偵測到行程衝突，已建議改期選項", status: "pending" },
    { id: "s3", timestamp: "2026-07-14 09:30", summary: "會議前 30 分鐘提醒已發送", status: "success" },
  ],
  card: [
    { id: "c1", timestamp: "2026-07-10 11:20", summary: "掃描名片「陳經理 / ABC 公司」並建立聯絡人", status: "success" },
    { id: "c2", timestamp: "2026-07-09 16:40", summary: "會後跟進信已寄出（5 位新聯絡人）", status: "success" },
    { id: "c3", timestamp: "2026-07-08 13:05", summary: "名片影像模糊，OCR 辨識失敗", status: "failed" },
  ],
  expense: [
    { id: "e1", timestamp: "尚未啟用", summary: "此 Agent 目前為草稿狀態，尚未開始運作", status: "pending" },
  ],
  visit: [
    { id: "v1", timestamp: "尚未啟用", summary: "此 Agent 目前為草稿狀態，尚未開始運作", status: "pending" },
  ],
  today: [
    { id: "t1", timestamp: "尚未啟用", summary: "此 Agent 目前為草稿狀態，尚未開始運作", status: "pending" },
  ],
  competitor: [
    { id: "co1", timestamp: "尚未啟用", summary: "此 Agent 目前為草稿狀態，尚未開始運作", status: "pending" },
  ],
  operations: [
    { id: "op1", timestamp: "尚未啟用", summary: "營運儀表板已建立，尚待填入各產品線現況", status: "pending" },
  ],
};
