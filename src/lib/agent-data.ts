import type { AgentActivity, AgentMeta, AgentSlug } from "./types";

export const AGENTS: AgentMeta[] = [
  {
    slug: "notify",
    name: "通知 Agent",
    shortName: "通知",
    tagline: "跳出提醒通知",
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
};
