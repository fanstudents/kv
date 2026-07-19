// 超級 Agent：由真人專業經理人（主理人）帶領的 Agent Team。
// 注意：kpis / weekly / activity 目前為「示意資料」，正式接數據前請保留示意標記。

export type MascotSpecies = "rabbit" | "bird" | "bear" | "owl" | "dog" | "cat";

export interface SuperPrincipal {
  name: string;
  title: string;
  /** public/ 下的照片路徑；沒有照片時以 initials 呈現 */
  photo?: string;
  initials: string;
}

export interface SuperTeamMember {
  name: string;
  species: MascotSpecies;
  color: string;
  prop: string;
}

export interface SuperAgentMeta {
  id: string;
  code: string;
  title: string;
  shortTitle: string;
  status: "active" | "preparing";
  principal: SuperPrincipal | null;
  /** [欄位, 內容]，如 ['實績', '…'] */
  dossier: [string, string][];
  desc: string;
  team: SuperTeamMember[];
  kpis: { label: string; value: string; delta?: string }[];
  weekly: { date: string; summary: string; decisions: string[] }[];
  activity: { timestamp: string; summary: string; status: "success" | "pending"; agent: string }[];
}

export const SUPER_AGENTS: SuperAgentMeta[] = [
  {
    id: "ecommerce",
    code: "SUP-EC",
    title: "電商營運超級 Agent",
    shortTitle: "電商營運",
    status: "active",
    principal: { name: "樊松蒲", title: "電商營運操盤手", photo: "/managers/fan.png", initials: "樊" },
    dossier: [
      ["實績", "15 年電商全通路操盤，經手品牌年營收破億"],
      ["專長", "廣告投放、轉換率優化、會員經營"],
      ["帶隊", "操盤 SOP 逐條寫進 Agent，每週看數據覆盤調參"],
    ],
    desc: "從接單到日報的全鏈路託管：客服回覆、訂單追蹤、廣告成效、營收日報，經理人每週覆盤、調整策略。",
    team: [
      { name: "訂單", species: "rabbit", color: "#F59E0B", prop: "📦" },
      { name: "客服", species: "rabbit", color: "#EC4899", prop: "🎧" },
      { name: "廣告", species: "bird", color: "#EF4444", prop: "📈" },
      { name: "報表", species: "owl", color: "#3B82F6", prop: "📊" },
      { name: "輿情", species: "cat", color: "#D946EF", prop: "📡" },
    ],
    kpis: [
      { label: "本月營收（歸因）", value: "NT$2.4M", delta: "+18%" },
      { label: "整體 ROAS", value: "4.2", delta: "+0.6" },
      { label: "深夜訊息回覆率", value: "100%" },
      { label: "本月覆盤次數", value: "4" },
    ],
    weekly: [
      {
        date: "2026-07-14",
        summary: "廣告 CPA 連三日上升，主理人調整受眾排除條件並降低疲勞素材預算。",
        decisions: ["關閉 2 組疲勞素材，預算移轉至新素材測試", "客服 Agent 新增「到貨延遲」安撫話術"],
      },
      {
        date: "2026-07-07",
        summary: "週末深夜訂單占比升至 31%，強化深夜客服追單流程。",
        decisions: ["深夜未結帳提醒改為 40 分鐘後發送", "報表 Agent 新增深夜時段營收欄位"],
      },
    ],
    activity: [
      { timestamp: "2026-07-16 23:12", summary: "深夜客訴 #4821 已回覆並安撫，標記待真人跟進", status: "success", agent: "客服" },
      { timestamp: "2026-07-16 21:40", summary: "未結帳購物車提醒發送 18 筆，回收 5 筆", status: "success", agent: "訂單" },
      { timestamp: "2026-07-16 09:00", summary: "昨日營收日報已寄出（含廣告花費歸因）", status: "success", agent: "報表" },
      { timestamp: "2026-07-15 18:22", summary: "偵測 Meta CPA 高於門檻 20%，已通知主理人", status: "success", agent: "廣告" },
    ],
  },
  {
    id: "service-sales",
    code: "SUP-CS",
    title: "客服業務超級 Agent",
    shortTitle: "客服業務",
    status: "active",
    principal: { name: "Joy", title: "客服暨銷售團隊教練", initials: "Joy" },
    dossier: [
      ["實績", "十年客服與電銷團隊管理，長期改善 NPS 與轉單率"],
      ["專長", "服務流程設計、把對話變訂單的話術架構"],
      ["帶隊", "每週檢視對話品質與轉單率，話術逐句調教"],
    ],
    desc: "接待、安撫、催單、回購喚醒——把客服部門變成第二個業務部門，經理人每週檢視對話品質與轉單率。",
    team: [
      { name: "LINE 客服", species: "rabbit", color: "#EC4899", prop: "🎧" },
      { name: "網站客服", species: "rabbit", color: "#EC4899", prop: "💬" },
      { name: "售後", species: "rabbit", color: "#EC4899", prop: "💝" },
      { name: "訂單", species: "rabbit", color: "#F59E0B", prop: "📦" },
    ],
    kpis: [
      { label: "平均首次回覆", value: "1.8 分" },
      { label: "詢問轉單率", value: "12.4%", delta: "+3.1%" },
      { label: "NPS", value: "62", delta: "+8" },
      { label: "回購喚醒成交", value: "38 筆" },
    ],
    weekly: [
      {
        date: "2026-07-14",
        summary: "「比價型」詢問轉單率偏低，主理人重寫價值比較話術並上線 A/B 測試。",
        decisions: ["新版比價話術上線（A/B 各 50%）", "售後 Agent 關懷時點從 D+7 調整為 D+3"],
      },
    ],
    activity: [
      { timestamp: "2026-07-16 20:05", summary: "詢問「還有貨嗎」→ 引導下單成功，訂單 #5233", status: "success", agent: "LINE 客服" },
      { timestamp: "2026-07-16 15:30", summary: "回購喚醒訊息發送 120 筆（D+30 名單）", status: "success", agent: "售後" },
      { timestamp: "2026-07-15 11:02", summary: "客訴對話已升級真人處理並附完整脈絡", status: "success", agent: "網站客服" },
    ],
  },
  {
    id: "threads",
    code: "SUP-TH",
    title: "Threads 自媒體超級 Agent",
    shortTitle: "Threads 自媒體",
    status: "active",
    principal: { name: "Jane", title: "Threads 內容策略操盤", initials: "Jane" },
    dossier: [
      ["實績", "Threads 萬粉帳號操盤，多篇貼文破百萬曝光"],
      ["專長", "選題策略、人設經營、演算法節奏"],
      ["帶隊", "每週選題會議，親自校準內容方向與口吻"],
    ],
    desc: "選題、寫文、排程、互動數據覆盤，把 Threads 從隨緣發文變成穩定獲客管道。",
    team: [
      { name: "社群", species: "bird", color: "#8B5CF6", prop: "📣" },
      { name: "文案", species: "bird", color: "#8B5CF6", prop: "✍️" },
      { name: "SEO", species: "bird", color: "#14B8A6", prop: "🔍" },
      { name: "競品", species: "cat", color: "#D946EF", prop: "🔭" },
    ],
    kpis: [
      { label: "本月曝光", value: "1.2M", delta: "+35%" },
      { label: "粉絲淨增", value: "+2,400" },
      { label: "破十萬曝光貼文", value: "3 篇" },
      { label: "導流名單", value: "156 筆" },
    ],
    weekly: [
      {
        date: "2026-07-13",
        summary: "「經營者日常」系列互動率最高，主理人拍板下週主打並定三個選題。",
        decisions: ["下週 5 篇中 3 篇走日常敘事線", "文案 Agent 口吻範本更新：句子再短一點"],
      },
    ],
    activity: [
      { timestamp: "2026-07-16 12:00", summary: "今日貼文已發佈，首小時互動率 6.2%", status: "success", agent: "社群" },
      { timestamp: "2026-07-16 09:30", summary: "明日貼文 3 版草稿完成，待主理人挑選", status: "pending", agent: "文案" },
      { timestamp: "2026-07-15 22:00", summary: "競品帳號本週動態摘要已產出", status: "success", agent: "競品" },
    ],
  },
  {
    id: "seo",
    code: "SUP-SEO",
    title: "SEO 超級 Agent",
    shortTitle: "SEO",
    status: "preparing",
    principal: null,
    dossier: [
      ["範疇", "關鍵字研究、內容產出、技術健檢、排名追蹤"],
      ["交付", "每週內容草稿與排名週報，每月策略檢視"],
      ["帶隊", "主理人遴選中——現由 TBR 內容團隊代管調教"],
    ],
    desc: "從關鍵字研究、內容產出到排名追蹤，把官網養成穩定的自然流量入口。",
    team: [
      { name: "SEO 內容", species: "bird", color: "#14B8A6", prop: "🔍" },
      { name: "文案", species: "bird", color: "#8B5CF6", prop: "✍️" },
      { name: "報表", species: "owl", color: "#3B82F6", prop: "📊" },
      { name: "競品", species: "cat", color: "#D946EF", prop: "🔭" },
    ],
    kpis: [
      { label: "追蹤關鍵字", value: "120 組" },
      { label: "進入前十名", value: "34 組", delta: "+9" },
      { label: "自然流量", value: "+42%" },
      { label: "本月內容產出", value: "16 篇" },
    ],
    weekly: [
      {
        date: "2026-07-11",
        summary: "「比較型」關鍵字群排名進步最快，加開一批比較文選題。",
        decisions: ["新增 6 組比較型關鍵字進追蹤清單", "舊文 4 篇安排改寫更新"],
      },
    ],
    activity: [
      { timestamp: "2026-07-16 08:00", summary: "本週排名週報已產出：3 組關鍵字進前十", status: "success", agent: "報表" },
      { timestamp: "2026-07-15 16:40", summary: "新文章草稿〈○○怎麼選〉完成待審", status: "pending", agent: "SEO 內容" },
    ],
  },
  {
    id: "email",
    code: "SUP-EM",
    title: "Email 行銷超級 Agent",
    shortTitle: "Email 行銷",
    status: "preparing",
    principal: null,
    dossier: [
      ["範疇", "名單分眾、旅程設計、EDM 產出、成效歸因"],
      ["交付", "每週分眾發送與成效報告，每月旅程優化"],
      ["帶隊", "主理人遴選中——現由 TBR 行銷團隊代管調教"],
    ],
    desc: "名單分眾、旅程設計、開信與轉換數據覆盤，把名單變成穩定回購的通路。",
    team: [
      { name: "EDM", species: "bird", color: "#8B5CF6", prop: "📨" },
      { name: "文案", species: "bird", color: "#8B5CF6", prop: "✍️" },
      { name: "售後", species: "rabbit", color: "#EC4899", prop: "💝" },
      { name: "報表", species: "owl", color: "#3B82F6", prop: "📊" },
    ],
    kpis: [
      { label: "平均開信率", value: "38.2%", delta: "+6%" },
      { label: "平均點擊率", value: "4.8%" },
      { label: "有效名單", value: "12,800" },
      { label: "歸因營收", value: "NT$420K" },
    ],
    weekly: [
      {
        date: "2026-07-10",
        summary: "喚醒旅程第二封信開信率偏低，改寫主旨並調整發送時間。",
        decisions: ["主旨改為提問句型，A/B 測試兩版", "發送時間從 10:00 調整為 20:30"],
      },
    ],
    activity: [
      { timestamp: "2026-07-16 20:30", summary: "回購喚醒信第二封已發送 3,200 筆", status: "success", agent: "EDM" },
      { timestamp: "2026-07-15 09:00", summary: "上週 EDM 成效報告已產出（開信 41%）", status: "success", agent: "報表" },
    ],
  },
];

export function getSuperAgent(id: string): SuperAgentMeta | undefined {
  return SUPER_AGENTS.find((s) => s.id === id);
}
