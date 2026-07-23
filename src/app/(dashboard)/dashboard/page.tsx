"use client";

import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Avatar from "@/components/agents/Avatar";
import OfficeScene from "@/components/office/OfficeScene";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { useMarketingMode } from "@/lib/marketing-mode";

export default function DashboardPage() {
  const [marketingMode] = useMarketingMode();
  const visibleAgents = marketingMode ? AGENTS.filter((a) => agentTeam(a.slug) === "marketing") : AGENTS;

  const activeCount = visibleAgents.filter((a) => a.status === "active").length;
  const totalRecipients = visibleAgents.reduce((sum, a) => sum + a.recipients, 0);

  return (
    <div>
      <PageHeader
        title="團隊總覽"
        description={`歡迎回到原騰數位科技！${AGENTS.length} 位 AI 隊友正在辦公室裡各司其職，點擊座位可查看細節`}
        actions={
          marketingMode ? (
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300">
              <Megaphone size={13} />
              行銷模式
            </span>
          ) : undefined
        }
      />

      <div className="mb-8">
        <OfficeScene />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-400">上工中隊友</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {activeCount} <span className="text-sm font-normal text-neutral-400">/ {visibleAgents.length}</span>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleAgents.map((agent) => (
          <Link key={agent.slug} href={`/agents/${agent.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar personEn={agent.personEn} color={agent.color} size={48} />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {agent.personEn} <span className="text-neutral-400">{agent.personZh}</span>
                    </p>
                    <p className="text-xs" style={{ color: agent.color }}>
                      {agent.role} · {agent.name}
                    </p>
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
        ))}
      </div>
    </div>
  );
}
