import Link from "next/link";
import { Bell, FileBarChart, CalendarClock, IdCard, Receipt, ArrowRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { AGENTS } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

const AGENT_ICONS: Record<AgentSlug, React.ElementType> = {
  notify: Bell,
  report: FileBarChart,
  schedule: CalendarClock,
  card: IdCard,
  expense: Receipt,
};

export default function DashboardPage() {
  const activeCount = AGENTS.filter((a) => a.status === "active").length;
  const totalRecipients = AGENTS.reduce((sum, a) => sum + a.recipients, 0);

  return (
    <div>
      <PageHeader
        title="總覽儀表板"
        description="管理埋設在 LINE 官方帳號中的 5 種 Agent，掌握每個 Agent 的運作狀態與成效"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-400">啟用中 Agent</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {activeCount} <span className="text-sm font-normal text-neutral-400">/ {AGENTS.length}</span>
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">本月累計觸發 / 執行次數</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">219</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">涵蓋 LINE 對象數</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">{totalRecipients}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {AGENTS.map((agent) => {
          const Icon = AGENT_ICONS[agent.slug];
          return (
            <Link key={agent.slug} href={`/agents/${agent.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: agent.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">{agent.name}</p>
                      <p className="text-xs text-neutral-400">{agent.tagline}</p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{agent.description}</p>

                <div className="mt-4 flex items-center gap-6">
                  {agent.metrics.map((m) => (
                    <div key={m.label}>
                      <p className="text-xs text-neutral-400">{m.label}</p>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {m.value}
                        {m.delta && <span className="ml-1 text-xs font-medium text-[#06C755]">{m.delta}</span>}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-400 dark:border-neutral-800">
                  <span>最近執行：{agent.lastRun}</span>
                  <span className="flex items-center gap-1 font-medium text-[#06C755]">
                    管理設定 <ArrowRight size={12} />
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
