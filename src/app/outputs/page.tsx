"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";

interface ActivityRow {
  id: string;
  agent_slug: string | null;
  occurred_at: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

export default function OutputsPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/activity?status=success&limit=500")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ActivityRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const table = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return AGENTS.map((agent) => {
      const agentRows = rows
        .filter((r) => r.agent_slug === agent.slug)
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      const recent = agentRows.filter((r) => new Date(r.occurred_at).getTime() >= cutoff);
      return {
        agent,
        total: agentRows.length,
        recent: recent.length,
        latest: agentRows[0],
      };
    });
  }, [rows]);

  const totalOutputs = table.reduce((sum, t) => sum + t.total, 0);
  const mostActive = [...table].sort((a, b) => b.total - a.total)[0];

  return (
    <div>
      <PageHeader title="產出總覽" description="一張表看到每位 Agent 實際完成了哪些工作" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-400">全隊累計產出</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded ? totalOutputs : "…"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">最活躍隊友</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded && mostActive && mostActive.total > 0
              ? `${mostActive.agent.personEn} ${mostActive.agent.personZh}`
              : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">近 30 天總產出</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded ? table.reduce((sum, t) => sum + t.recent, 0) : "…"}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Agent</th>
                <th className="px-4 py-3 text-left font-medium">狀態</th>
                <th className="px-4 py-3 text-right font-medium">累計產出</th>
                <th className="px-4 py-3 text-right font-medium">近 30 天</th>
                <th className="px-4 py-3 text-left font-medium">最新產出內容</th>
                <th className="px-4 py-3 text-left font-medium">時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {table.map(({ agent, total, recent, latest }) => (
                <tr key={agent.slug} className="hover:bg-neutral-50 dark:hover:bg-neutral-950/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar personEn={agent.personEn} color={agent.color} size={30} />
                      <div>
                        <p className="font-medium text-neutral-800 dark:text-neutral-100">
                          {agent.personEn} {agent.personZh}
                        </p>
                        <p className="text-xs text-neutral-400">{agent.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100">
                    {loaded ? total : "…"}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500 dark:text-neutral-400">
                    {loaded ? recent : "…"}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    {latest ? (
                      <span className="line-clamp-1">{latest.summary}</span>
                    ) : (
                      <span className="text-neutral-400">尚無產出紀錄</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-400">
                    {latest ? new Date(latest.occurred_at).toLocaleString("zh-TW") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
