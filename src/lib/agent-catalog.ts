// Agent 目錄（銷售導向）：通用型／專業型 20 位 Agent 的完整資料，
// 供公開的 /agents-catalog 頁面使用。與 src/lib/agent-data.ts（實際後台運作的
// 12 位 Agent）是兩份不同的資料——這裡是對外銷售用的職員名冊，
// 欄位、命名與行銷頁 public/agent-team.html 的 ROSTER 一致，方便對照。

import type { LucideIcon } from "lucide-react";
import {
  MessageCircle,
  Sparkles,
  Search,
  Send,
  UserCheck,
  Globe,
  Database,
  Webhook,
  ShoppingCart,
  Truck,
  CheckCircle2,
  Eye,
  CalendarDays,
  Mail,
  ListChecks,
  Tags,
  FileText,
  RefreshCw,
  Image as ImageIcon,
  BarChart3,
  Archive,
  AlertTriangle,
  Mic,
  Bell,
  Flag,
  Receipt,
  Users,
  MessageSquareText,
} from "lucide-react";
import type { MascotSpecies } from "./super-agent-data";

export interface CatalogFlowStep {
  label: string;
  icon: LucideIcon;
}

export type CatalogTier = 1 | 2 | 3;

export interface CatalogAgent {
  id: string;
  dept: string;
  deptEn: string;
  name: string;
  color: string;
  species: MascotSpecies;
  prop: string;
  tier: CatalogTier;
  desc: string;
  flow: CatalogFlowStep[];
  /** 什麼樣的公司／情境適合聘這位 Agent，一句話講清楚。 */
  fit: string;
  /** 導入前需要準備的權限或資料，一句話講清楚。 */
  needs: string;
}

export const TIER_LABEL: Record<CatalogTier, string> = {
  1: "通用型",
  2: "專業型",
  3: "專業型・重度",
};

export const TIER_PRICE: Record<CatalogTier, string> = {
  1: "NT$1,500／月起",
  2: "NT$2,800／月",
  3: "NT$5,800／月",
};

const SPECIES: Record<string, MascotSpecies> = {
  客服部: "rabbit",
  行銷部: "bird",
  營運部: "bear",
  財務部: "owl",
  人資部: "dog",
  情報部: "cat",
};

export const AGENT_CATALOG: CatalogAgent[] = [
  // 客服部
  {
    id: "CS-01", dept: "客服部", deptEn: "DEPT-CS", name: "LINE 客服 Agent",
    color: "#EC4899", species: SPECIES["客服部"], prop: "🎧", tier: 2,
    desc: "24 小時回覆 LINE OA 進線，聽得懂上下文，該轉真人時會轉。",
    fit: "適合 LINE 詢問量大、常有半夜或假日訊息湧入的品牌。",
    needs: "LINE OA 官方帳號、常見問題的知識庫內容。",
    flow: [
      { label: "接收 LINE 訊息", icon: MessageCircle },
      { label: "AI 理解意圖", icon: Sparkles },
      { label: "比對知識庫", icon: Search },
      { label: "生成回覆", icon: Send },
      { label: "視情況轉真人", icon: UserCheck },
    ],
  },
  {
    id: "CS-02", dept: "客服部", deptEn: "DEPT-CS", name: "網站客服 Agent",
    color: "#EC4899", species: SPECIES["客服部"], prop: "💬", tier: 2,
    desc: "官網即時對話窗，用你的知識庫回答，不亂編。",
    fit: "適合官網流量高、想在網站上直接留住詢問的品牌。",
    needs: "官網嵌入對話視窗的權限、常見問題知識庫。",
    flow: [
      { label: "訪客提問", icon: Globe },
      { label: "比對知識庫", icon: Search },
      { label: "AI 生成回覆", icon: Sparkles },
      { label: "即時顯示", icon: Send },
      { label: "記錄對話", icon: Database },
    ],
  },
  {
    id: "CS-03", dept: "客服部", deptEn: "DEPT-CS", name: "訂單追蹤 Agent",
    color: "#F59E0B", species: SPECIES["客服部"], prop: "📦", tier: 2,
    desc: "接收訂單 Webhook，主動通知出貨、到貨、逾期未取。",
    fit: "適合訂單量穩定、客人常主動追問「到哪了」的電商。",
    needs: "訂單系統或電商平台的 Webhook／API 串接。",
    flow: [
      { label: "接收訂單 Webhook", icon: Webhook },
      { label: "解析訂單狀態", icon: ShoppingCart },
      { label: "比對物流進度", icon: Truck },
      { label: "主動通知客戶", icon: Send },
      { label: "完成記錄", icon: CheckCircle2 },
    ],
  },
  {
    id: "CS-04", dept: "客服部", deptEn: "DEPT-CS", name: "售後關懷 Agent",
    color: "#EC4899", species: SPECIES["客服部"], prop: "💝", tier: 1,
    desc: "購買後自動關懷、蒐集評價，把一次客變回頭客。",
    fit: "適合想提高回購率、系統性蒐集評價的品牌。",
    needs: "購買完成的觸發事件、關懷訊息或問卷內容。",
    flow: [
      { label: "偵測購買完成", icon: Eye },
      { label: "排程關懷時間", icon: CalendarDays },
      { label: "發送問候／調查", icon: Mail },
      { label: "蒐集回饋", icon: ListChecks },
      { label: "標記回購名單", icon: Tags },
    ],
  },
  // 行銷部
  {
    id: "MK-01", dept: "行銷部", deptEn: "DEPT-MK", name: "文案 Agent",
    color: "#8B5CF6", species: SPECIES["行銷部"], prop: "✍️", tier: 2,
    desc: "照你的品牌口吻寫貼文、廣告、產品文案，一次出多版本。",
    fit: "適合需要大量產出貼文、廣告文案，行銷人力常常不夠用的團隊。",
    needs: "品牌口吻與過去文案範例，讓 AI 抓到你的調性。",
    flow: [
      { label: "讀取品牌口吻", icon: FileText },
      { label: "產出多版本文案", icon: Sparkles },
      { label: "AI 自我審核語氣", icon: RefreshCw },
      { label: "提供選稿", icon: ListChecks },
      { label: "交付定稿", icon: CheckCircle2 },
    ],
  },
  {
    id: "MK-02", dept: "行銷部", deptEn: "DEPT-MK", name: "社群小編 Agent",
    color: "#8B5CF6", species: SPECIES["行銷部"], prop: "📣", tier: 2,
    desc: "排程發文、回留言、整理每週社群成效。",
    fit: "適合想固定經營社群，但沒有專職小編的團隊。",
    needs: "社群帳號管理權限、發文素材來源（照片／設計稿）。",
    flow: [
      { label: "發想主題", icon: Sparkles },
      { label: "產生圖文素材", icon: ImageIcon },
      { label: "排程發文", icon: CalendarDays },
      { label: "監測互動", icon: BarChart3 },
      { label: "彙整成效", icon: Archive },
    ],
  },
  {
    id: "MK-03", dept: "行銷部", deptEn: "DEPT-MK", name: "廣告成效 Agent",
    color: "#EF4444", species: SPECIES["行銷部"], prop: "📈", tier: 3,
    desc: "串接 Meta／Google 後台，每天固定時間把重點數字送到你面前。",
    fit: "適合有在投放 Meta／Google 廣告，卻沒空天天盯後台的團隊。",
    needs: "廣告帳號的檢視或管理權限。",
    flow: [
      { label: "串接廣告帳號", icon: Webhook },
      { label: "監控每日花費", icon: Eye },
      { label: "偵測異常 CPA", icon: AlertTriangle },
      { label: "提出優化建議", icon: Sparkles },
      { label: "推播摘要", icon: Send },
    ],
  },
  {
    id: "MK-04", dept: "行銷部", deptEn: "DEPT-MK", name: "SEO 內容 Agent",
    color: "#14B8A6", species: SPECIES["行銷部"], prop: "🔍", tier: 2,
    desc: "找關鍵字、擬大綱、產內容草稿，養你的自然流量。",
    fit: "適合想長期經營自然流量、但沒有 SEO 專職人力的網站。",
    needs: "Search Console 或網站分析工具的存取權限。",
    flow: [
      { label: "關鍵字研究", icon: Search },
      { label: "擬內容大綱", icon: FileText },
      { label: "AI 產出草稿", icon: Sparkles },
      { label: "內部審核", icon: UserCheck },
      { label: "發佈追蹤排名", icon: BarChart3 },
    ],
  },
  {
    id: "MK-05", dept: "行銷部", deptEn: "DEPT-MK", name: "EDM／推播 Agent",
    color: "#8B5CF6", species: SPECIES["行銷部"], prop: "📨", tier: 1,
    desc: "依標籤分眾發送 LINE 推播與 Email，不再亂槍打鳥。",
    fit: "適合已經有一定會員名單、想做分眾行銷的品牌。",
    needs: "會員名單與分眾標籤、LINE OA 或 Email 發送權限。",
    flow: [
      { label: "名單分眾", icon: Tags },
      { label: "產生分眾內容", icon: Mail },
      { label: "排程發送", icon: CalendarDays },
      { label: "追蹤開信／點擊", icon: BarChart3 },
      { label: "更新名單標籤", icon: RefreshCw },
    ],
  },
  // 營運部
  {
    id: "OP-01", dept: "營運部", deptEn: "DEPT-OP", name: "會議記錄 Agent",
    color: "#F97316", species: SPECIES["營運部"], prop: "📝", tier: 2,
    desc: "錄音轉逐字稿、整理決議與待辦，散會五分鐘寄給所有人。",
    fit: "適合會議多、常常沒人記錄或事後沒人整理待辦的團隊。",
    needs: "會議錄音檔，或線上會議的錄音權限。",
    flow: [
      { label: "錄音上傳", icon: Mic },
      { label: "AI 轉逐字稿", icon: Sparkles },
      { label: "摘要決議事項", icon: FileText },
      { label: "產出待辦清單", icon: ListChecks },
      { label: "寄送給與會者", icon: Send },
    ],
  },
  {
    id: "OP-02", dept: "營運部", deptEn: "DEPT-OP", name: "排程提醒 Agent",
    color: "#06C755", species: SPECIES["營運部"], prop: "⏰", tier: 1,
    desc: "盯專案節點、盯交期、盯續約日，該提醒的絕不漏。",
    fit: "適合專案節點多、容易漏掉交期或續約日的團隊。",
    needs: "專案時程表或需要追蹤的日期清單。",
    flow: [
      { label: "讀取專案節點", icon: CalendarDays },
      { label: "比對交期", icon: Search },
      { label: "判斷即將到期", icon: AlertTriangle },
      { label: "發送提醒", icon: Bell },
      { label: "標記完成", icon: CheckCircle2 },
    ],
  },
  {
    id: "OP-03", dept: "營運部", deptEn: "DEPT-OP", name: "知識庫 Agent",
    color: "#F97316", species: SPECIES["營運部"], prop: "📚", tier: 2,
    desc: "把公司 SOP、常見問題變成能被問的大腦，新人不用一直問老人。",
    fit: "適合新人多、SOP 常常靠口耳相傳的團隊。",
    needs: "現有的 SOP 文件、常見問題整理。",
    flow: [
      { label: "匯入 SOP 文件", icon: Archive },
      { label: "建立知識索引", icon: Database },
      { label: "接收提問", icon: MessageCircle },
      { label: "比對回答", icon: Search },
      { label: "標記待補充", icon: Flag },
    ],
  },
  {
    id: "OP-04", dept: "營運部", deptEn: "DEPT-OP", name: "翻譯在地化 Agent",
    color: "#F97316", species: SPECIES["營運部"], prop: "🌐", tier: 1,
    desc: "文件、商品頁、合約多語互譯，維持術語一致。",
    fit: "適合有外銷、跨境業務，常需要多語文件的公司。",
    needs: "需要翻譯的文件與慣用術語對照表。",
    flow: [
      { label: "接收原文", icon: Globe },
      { label: "AI 初譯", icon: Sparkles },
      { label: "術語庫校對", icon: Search },
      { label: "語氣調整", icon: RefreshCw },
      { label: "交付譯文", icon: CheckCircle2 },
    ],
  },
  // 財務部
  {
    id: "FN-01", dept: "財務部", deptEn: "DEPT-FN", name: "對帳 Agent",
    color: "#3B82F6", species: SPECIES["財務部"], prop: "🧾", tier: 3,
    desc: "金流、訂單、發票三方核對，抓出對不上的那一筆。",
    fit: "適合金流、訂單、發票分散在不同系統，人工對帳很花時間的公司。",
    needs: "金流、訂單、發票三方的資料存取權限。",
    flow: [
      { label: "匯入金流／訂單／發票", icon: Database },
      { label: "三方比對", icon: Search },
      { label: "標出差異", icon: AlertTriangle },
      { label: "產出對帳報告", icon: FileText },
      { label: "通知承辦人", icon: Send },
    ],
  },
  {
    id: "FN-02", dept: "財務部", deptEn: "DEPT-FN", name: "請款發票 Agent",
    color: "#3B82F6", species: SPECIES["財務部"], prop: "💳", tier: 2,
    desc: "整理請款單據、開立通知、追蹤未付款項。",
    fit: "適合供應商或合作對象多，請款容易漏追蹤的公司。",
    needs: "請款項目清單、發票開立流程。",
    flow: [
      { label: "彙整待請款項目", icon: ListChecks },
      { label: "開立通知", icon: Receipt },
      { label: "發送提醒", icon: Bell },
      { label: "追蹤付款狀態", icon: Eye },
      { label: "更新入帳紀錄", icon: CheckCircle2 },
    ],
  },
  {
    id: "FN-03", dept: "財務部", deptEn: "DEPT-FN", name: "營運報表 Agent",
    color: "#3B82F6", species: SPECIES["財務部"], prop: "📊", tier: 3,
    desc: "每日／每週自動彙整營收、成本、廣告花費成一頁報表。",
    fit: "適合營收、成本、廣告花費散落在不同後台，想要一頁看懂的公司。",
    needs: "各項數據來源（金流、廣告、營運系統）的存取權限。",
    flow: [
      { label: "串接各項數據源", icon: Database },
      { label: "彙整營收成本", icon: BarChart3 },
      { label: "AI 產出洞察", icon: Sparkles },
      { label: "排版報表", icon: FileText },
      { label: "定時推播", icon: Send },
    ],
  },
  // 人資部
  {
    id: "HR-01", dept: "人資部", deptEn: "DEPT-HR", name: "履歷篩選 Agent",
    color: "#0EA5E9", species: SPECIES["人資部"], prop: "🗂️", tier: 1,
    desc: "依你的條件初篩履歷、標重點，附上追問建議。",
    fit: "適合徵才量大、履歷常常來不及一一細看的團隊。",
    needs: "職缺條件與篩選標準、履歷來源（Email 或求職平台）。",
    flow: [
      { label: "接收履歷", icon: Users },
      { label: "AI 比對條件", icon: Sparkles },
      { label: "標記重點", icon: Tags },
      { label: "產出追問建議", icon: MessageSquareText },
      { label: "分類排序", icon: ListChecks },
    ],
  },
  {
    id: "HR-02", dept: "人資部", deptEn: "DEPT-HR", name: "面試排程 Agent",
    color: "#0EA5E9", species: SPECIES["人資部"], prop: "🤝", tier: 1,
    desc: "和候選人來回喬時間、發通知、前一天提醒雙方。",
    fit: "適合面試場次多、來回喬時間很耗人力的團隊。",
    needs: "面試官的行事曆存取權限。",
    flow: [
      { label: "接收候選人時段", icon: CalendarDays },
      { label: "比對面試官行事曆", icon: Search },
      { label: "確認／協調時間", icon: RefreshCw },
      { label: "發送通知", icon: Send },
      { label: "前一天提醒", icon: Bell },
    ],
  },
  // 情報部
  {
    id: "IN-01", dept: "情報部", deptEn: "DEPT-IN", name: "輿情監控 Agent",
    color: "#D946EF", species: SPECIES["情報部"], prop: "📡", tier: 2,
    desc: "盯著社群與評論區，負評出現第一時間通知你。",
    fit: "適合品牌聲量重要、怕負評沒被即時發現的公司。",
    needs: "要監測的品牌關鍵字、社群或評論來源。",
    flow: [
      { label: "監測社群／評論來源", icon: Globe },
      { label: "AI 情緒判讀", icon: Sparkles },
      { label: "標出負評", icon: AlertTriangle },
      { label: "即時通知", icon: Bell },
      { label: "記錄追蹤", icon: Database },
    ],
  },
  {
    id: "IN-02", dept: "情報部", deptEn: "DEPT-IN", name: "競品追蹤 Agent",
    color: "#D946EF", species: SPECIES["情報部"], prop: "🔭", tier: 2,
    desc: "追蹤對手的價格、新品與活動，每週給你一份敵情摘要。",
    fit: "適合競爭激烈、需要隨時掌握對手動態的產業。",
    needs: "要追蹤的競品名單。",
    flow: [
      { label: "監測對手動態", icon: Globe },
      { label: "蒐集價格／活動資訊", icon: Search },
      { label: "AI 彙整摘要", icon: Sparkles },
      { label: "產出敵情週報", icon: FileText },
      { label: "推播提醒", icon: Send },
    ],
  },
];

export const DEPT_ORDER = ["客服部", "行銷部", "營運部", "財務部", "人資部", "情報部"];

export function agentsByTier(tier: CatalogTier | CatalogTier[]): CatalogAgent[] {
  const tiers = Array.isArray(tier) ? tier : [tier];
  return AGENT_CATALOG.filter((a) => tiers.includes(a.tier));
}
