"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";

interface ActivityRow {
  id: string;
  agent_slug: string | null;
  occurred_at: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

export default function AnomaliesPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/activity?limit=300")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ActivityRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const failures = useMemo(() => rows.filter((r) => r.status === "failed"), [rows]);
  const last24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return failures.filter((r) => new Date(r.occurred_at).getTime() >= cutoff);
  }, [failures]);

  const perAgent = useMemo(() => {
    return AGENTS.map((agent) => {
      const agentRows = rows.filter((r) => r.agent_slug === agent.slug);
      return {
        agent,
        total: agentRows.length,
        failed: agentRows.filter((r) => r.status === "failed").length,
        success: agentRows.filter((r) => r.status === "success").length,
        pending: agentRows.filter((r) => r.status === "pending").length,
      };
    }).sort((a, b) => b.failed - a.failed);
  }, [rows]);

  const healthyCount = perAgent.filter((a) => a.failed === 0).length;

  const findAgent = (slug: string | null) => AGENTS.find((a) => a.slug === slug);

  return (
    <div>
      <PageHeader
        title="異常儀表板"
        description="彙整所有 Agent 的失敗與異常事件，第一時間掌握系統健康度"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-400">目前累計失敗事件</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
            {loaded ? failures.length : "…"}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">近 24 小時內失敗</p>
          <p className="mt-1 text-2xl font-semibold text-red-500">{loaded ? last24h.length : "…"}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">健康 Agent 數（零失敗）</p>
          <p className="mt-1 text-2xl font-semibold text-[#06C755]">
            {healthyCount} <span className="text-sm font-normal text-neutral-400">/ {AGENTS.length}</span>
          </p>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">各 Agent 健康度</h2>
        <div className="space-y-2">
          {perAgent.map(({ agent, total, failed, success, pending }) => (
            <div
              key={agent.slug}
              className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 dark:border-neutral-800"
            >
              <div className="flex items-center gap-2.5">
                <Avatar personEn={agent.personEn} color={agent.color} size={28} />
                <div>
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {agent.personEn} {agent.personZh}
                  </p>
                  <p className="text-xs text-neutral-400">{agent.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {total === 0 ? (
                  <span className="text-neutral-400">尚無記錄</span>
                ) : (
                  <>
                    {failed > 0 && <Badge tone="danger">{failed} 失敗</Badge>}
                    {pending > 0 && <Badge tone="warning">{pending} 待處理</Badge>}
                    <Badge tone="success">{success} 成功</Badge>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">最近異常事件</h2>
        {!loaded && <p className="text-sm text-neutral-400">載入中…</p>}
        {loaded && failures.length === 0 && (
          <div className="flex items-center gap-2 py-6 text-sm text-neutral-400">
            <CheckCircle2 size={18} className="text-[#06C755]" />
            目前沒有任何異常事件，一切運作正常。
          </div>
        )}
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {failures.map((row) => {
            const agent = findAgent(row.agent_slug);
            return (
              <li key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                {agent ? (
                  <Avatar personEn={agent.personEn} color={agent.color} size={28} />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                    <AlertTriangle size={14} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {agent ? `${agent.personEn} ${agent.personZh} · ${agent.name}` : "系統 · LINE Webhook"}
                  </p>
                  <p className="text-sm text-neutral-800 dark:text-neutral-100">{row.summary}</p>
                  <p className="text-xs text-neutral-400">{new Date(row.occurred_at).toLocaleString("zh-TW")}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
