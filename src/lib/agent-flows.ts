import {
  Eye,
  Filter,
  Send,
  CheckCircle2,
  Database,
  BarChart3,
  Sparkles,
  CalendarDays,
  Search,
  RefreshCw,
  Bell,
  ScanLine,
  Users,
  Mail,
  Receipt,
  Archive,
  UserCheck,
  MessageSquareText,
  CalendarCheck,
  ListChecks,
  Globe,
  Tags,
  AlertTriangle,
  Flag,
  Briefcase,
  Headphones,
  MessageCircle,
  ShoppingCart,
  Webhook,
  Coins,
  type LucideIcon,
} from "lucide-react";
import type { AgentSlug } from "./types";
import type { FlowStep, FlowStepState } from "@/components/agents/VisitFlowSteps";

interface FlowStepDef {
  key: string;
  label: string;
  icon: LucideIcon;
}

// 每位 Agent 的任務節點流程定義（依照實際運作方式拆解）
export const AGENT_FLOWS: Record<AgentSlug, FlowStepDef[]> = {
  teamlead: [
    { key: "collect", label: "巡視團隊動態", icon: Eye },
    { key: "analyze", label: "彙整 24h 工作", icon: Database },
    { key: "summarize", label: "AI 撰寫摘要", icon: Sparkles },
    { key: "push", label: "LINE 晨報匯報", icon: Send },
  ],
  notify: [
    { key: "watch", label: "監測指標", icon: Eye },
    { key: "match", label: "條件成立", icon: Filter },
    { key: "push", label: "LINE 推播", icon: Send },
    { key: "done", label: "完成回報", icon: CheckCircle2 },
  ],
  report: [
    { key: "collect", label: "串接數據源", icon: Database },
    { key: "build", label: "彙整成效指標", icon: BarChart3 },
    { key: "ai", label: "AI 洞察建議", icon: Sparkles },
    { key: "send", label: "推播報表", icon: Send },
  ],
  schedule: [
    { key: "receive", label: "接收預約", icon: CalendarDays },
    { key: "check", label: "檢查衝突", icon: Search },
    { key: "confirm", label: "確認/改期", icon: RefreshCw },
    { key: "remind", label: "發送提醒", icon: Bell },
  ],
  card: [
    { key: "idea", label: "發想貼文主題", icon: Sparkles },
    { key: "draft", label: "產生圖文素材", icon: Mail },
    { key: "schedule", label: "安排發文排程", icon: CalendarDays },
    { key: "track", label: "追蹤互動成效", icon: BarChart3 },
  ],
  expense: [
    { key: "track", label: "追蹤關鍵字排名", icon: Search },
    { key: "traffic", label: "分析自然流量", icon: BarChart3 },
    { key: "audit", label: "找出優化機會", icon: Filter },
    { key: "suggest", label: "提出改善建議", icon: Sparkles },
  ],
  visit: [
    { key: "scan", label: "掃描名片", icon: ScanLine },
    { key: "internal", label: "內部確認", icon: UserCheck },
    { key: "sent", label: "寄出邀約信", icon: Mail },
    { key: "reply", label: "客戶回覆", icon: MessageSquareText },
    { key: "calendar", label: "行事曆建立", icon: CalendarCheck },
  ],
  today: [
    { key: "monitor", label: "監控投放成效", icon: Eye },
    { key: "detect", label: "偵測異常", icon: AlertTriangle },
    { key: "optimize", label: "預算/素材建議", icon: Sparkles },
    { key: "notify", label: "LINE 提醒", icon: Send },
  ],
  competitor: [
    { key: "collect", label: "監測聲量", icon: Globe },
    { key: "tag", label: "情緒分級", icon: Tags },
    { key: "grade", label: "標出負評", icon: AlertTriangle },
    { key: "action", label: "回應建議", icon: Flag },
  ],
  operations: [
    { key: "collect", label: "彙整產品線", icon: Briefcase },
    { key: "update", label: "更新狀態", icon: RefreshCw },
    { key: "next", label: "標記下一步", icon: Flag },
    { key: "board", label: "儀表板呈現", icon: BarChart3 },
  ],
  support: [
    { key: "receive", label: "接收客戶訊息", icon: MessageCircle },
    { key: "log", label: "記錄對話", icon: Database },
    { key: "reply", label: "自動回覆", icon: Headphones },
    { key: "handoff", label: "轉真人待處理", icon: UserCheck },
  ],
  orders: [
    { key: "webhook", label: "接收訂單 Webhook", icon: Webhook },
    { key: "parse", label: "解析訂單內容", icon: ShoppingCart },
    { key: "amount", label: "確認金額品項", icon: Coins },
    { key: "notify", label: "LINE 即時通知", icon: Send },
  ],
};

export interface LatestRun {
  status: "success" | "failed" | "pending";
  timestamp?: string;
  summary?: string;
}

// 依最近一次執行結果推導每個節點的狀態：
// 成功 → 全部完成；進行中 → 走到一半；失敗 → 中途卡住；沒有紀錄 → 待命
export function deriveFlowSteps(slug: AgentSlug, latest?: LatestRun): FlowStep[] {
  const defs = AGENT_FLOWS[slug];
  const n = defs.length;

  const stateAt = (index: number): FlowStepState => {
    if (!latest) return index === 0 ? "active" : "skipped";
    if (latest.status === "success") return "done";
    if (latest.status === "pending") {
      const progress = Math.ceil(n / 2);
      if (index < progress) return "done";
      if (index === progress) return "active";
      return "skipped";
    }
    // failed：前面完成，倒數第二個節點標記失敗
    const failAt = Math.max(1, n - 2);
    if (index < failAt) return "done";
    if (index === failAt) return "failed";
    return "skipped";
  };

  return defs.map((def, i) => ({
    key: def.key,
    label: def.label,
    icon: def.icon,
    state: stateAt(i),
    detail: i === 0 && latest?.timestamp ? latest.timestamp : undefined,
  }));
}
