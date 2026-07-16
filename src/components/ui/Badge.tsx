import type { AgentStatus } from "@/lib/types";

const STATUS_STYLES: Record<AgentStatus, string> = {
  active: "bg-[#06C755]/10 text-[#06C755] dark:bg-[#06C755]/15",
  paused: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  draft: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  active: "啟用中",
  paused: "已暫停",
  draft: "草稿",
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300",
    success: "bg-[#06C755]/10 text-[#06C755]",
    danger: "bg-red-500/10 text-red-500",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
