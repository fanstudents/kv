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
  notify: [
    { key: "watch", label: "監測指標", icon: Eye },
    { key: "match", label: "條件成立", icon: Filter },
    { key: "push", label: "LINE 推播", icon: Send },
    { key: "done", label: "完成回報", icon: CheckCircle2 },
  ],
  report: [
    { key: "collect", label: "彙整數據", icon: Database },
    { key: "build", label: "產出報表", icon: BarChart3 },
    { key: "ai", label: "AI 行動建議", icon: Sparkles },
    { key: "send", label: "排程寄送", icon: Send },
  ],
  schedule: [
    { key: "receive", label: "接收預約", icon: CalendarDays },
    { key: "check", label: "檢查衝突", icon: Search },
    { key: "confirm", label: "確認/改期", icon: RefreshCw },
    { key: "remind", label: "發送提醒", icon: Bell },
  ],
  card: [
    { key: "scan", label: "掃描名片", icon: ScanLine },
    { key: "contact", label: "建立聯絡人", icon: Users },
    { key: "draft", label: "產生會後信", icon: Mail },
    { key: "send", label: "寄出跟進", icon: Send },
  ],
  expense: [
    { key: "scan", label: "掃描發票", icon: Receipt },
    { key: "ocr", label: "辨識金額", icon: Search },
    { key: "archive", label: "歸檔表單", icon: Archive },
    { key: "remind", label: "截止提醒", icon: Bell },
  ],
  visit: [
    { key: "scan", label: "掃描名片", icon: ScanLine },
    { key: "internal", label: "內部確認", icon: UserCheck },
    { key: "sent", label: "寄出邀約信", icon: Mail },
    { key: "reply", label: "客戶回覆", icon: MessageSquareText },
    { key: "calendar", label: "行事曆建立", icon: CalendarCheck },
  ],
  today: [
    { key: "scan", label: "掃描信箱與 LINE", icon: Search },
    { key: "list", label: "彙整待辦", icon: ListChecks },
    { key: "judge", label: "判斷完成狀態", icon: Filter },
    { key: "remind", label: "逾期提醒", icon: Bell },
  ],
  competitor: [
    { key: "collect", label: "蒐集情報", icon: Globe },
    { key: "tag", label: "標籤分類", icon: Tags },
    { key: "grade", label: "影響分級", icon: AlertTriangle },
    { key: "action", label: "行動建議", icon: Flag },
  ],
  operations: [
    { key: "collect", label: "彙整產品線", icon: Briefcase },
    { key: "update", label: "更新狀態", icon: RefreshCw },
    { key: "next", label: "標記下一步", icon: Flag },
    { key: "board", label: "儀表板呈現", icon: BarChart3 },
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
