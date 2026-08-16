import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

import Avatar from "@/components/agents/Avatar";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { createSupabaseRunHistoryRepository } from "@/adapters/agent-runtime/supabase-run-history";
import { AGENTS } from "@/lib/agent-data";
import {
  listRunHistory,
  RUN_STATUSES,
  type RunHistoryRow,
  type RunStatus,
} from "@/modules/agent-runtime/history";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RunStatus, string> = {
  running: "執行中",
  success: "成功",
  failed: "失敗",
  waiting: "等待中",
  cancelled: "已取消",
};

const STATUS_TONE: Record<RunStatus, "neutral" | "success" | "danger" | "warning"> = {
  running: "warning",
  success: "success",
  failed: "danger",
  waiting: "warning",
  cancelled: "neutral",
};

function formatTime(value: string): string {
  return new Date(value).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function agentMeta(slug: string) {
  return AGENTS.find((agent) => agent.slug === slug);
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; status?: string }>;
}) {
  const filters = await searchParams;
  let rows: RunHistoryRow[] = [];
  let loadError = "";

  try {
    rows = await listRunHistory(createSupabaseRunHistoryRepository(), {
      agentSlug: filters.agent,
      status: filters.status,
      limit: 100,
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "無法讀取執行紀錄";
  }

  return (
    <div>
      <PageHeader title="執行紀錄" description="查看每次執行的狀態、流程步驟、產出與 AI 成本" />

      <form className="mb-4 flex flex-wrap items-end gap-3" action="/runs">
        <label className="text-xs text-neutral-500">
          Agent
          <select
            name="agent"
            defaultValue={filters.agent ?? ""}
            className="mt-1 block rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <option value="">全部</option>
            {AGENTS.map((agent) => (
              <option key={agent.slug} value={agent.slug}>
                {agent.personZh}（{agent.name}）
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-500">
          狀態
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="mt-1 block rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <option value="">全部</option>
            {RUN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          套用篩選
        </button>
        <span className="ml-auto text-sm text-neutral-400">共 {rows.length} 次執行</span>
      </form>

      {loadError ? (
        <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertTriangle size={16} />
            執行紀錄目前無法載入
          </p>
          <p className="mt-1 text-sm text-red-500/80">{loadError}</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-400">目前沒有符合條件的執行紀錄。</p>
        </Card>
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((run) => {
              const agent = agentMeta(run.agentSlug);
              return (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  {agent ? <Avatar personEn={agent.personEn} color={agent.color} size={34} /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {agent ? `${agent.personZh}（${agent.name}）` : run.agentSlug}
                      </span>
                      <Badge tone={STATUS_TONE[run.status]}>{STATUS_LABEL[run.status]}</Badge>
                      {run.parentRunId ? <Badge tone="warning">補救執行</Badge> : null}
                    </span>
                    <span className="mt-1 block truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {run.summary ?? run.errorDetail ?? "沒有摘要"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-neutral-400">
                    <span className="block">{formatTime(run.startedAt)}</span>
                    <span className="block">{run.totalTokens.toLocaleString("en-US")} tokens</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-neutral-300" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
