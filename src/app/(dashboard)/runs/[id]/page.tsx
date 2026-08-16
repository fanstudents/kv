import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";

import { createSupabaseRunHistoryRepository } from "@/adapters/agent-runtime/supabase-run-history";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { AGENTS } from "@/lib/agent-data";
import { getRunHistoryDetail, type RunStatus } from "@/modules/agent-runtime/history";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RunStatus, string> = {
  running: "執行中",
  success: "成功",
  failed: "失敗",
  waiting: "等待中",
  cancelled: "已取消",
};

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detail;

  try {
    detail = await getRunHistoryDetail(createSupabaseRunHistoryRepository(), id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "無法讀取執行細節";
    return (
      <div>
        <PageHeader title="執行細節" />
        <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertTriangle size={16} />
            執行細節目前無法載入
          </p>
          <p className="mt-1 text-sm text-red-500/80">{message}</p>
        </Card>
      </div>
    );
  }

  if (!detail) notFound();
  const agent = AGENTS.find((item) => item.slug === detail.run.agentSlug);

  return (
    <div>
      <PageHeader
        title={agent ? `${agent.personZh}（${agent.name}）的執行細節` : `${detail.run.agentSlug} 的執行細節`}
        description={detail.run.summary ?? "查看這次執行留下的步驟、產出與成本紀錄"}
        actions={
          <Link href="/runs" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white">
            <ArrowLeft size={14} /> 返回執行紀錄
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-neutral-400">狀態</p>
          <div className="mt-2"><Badge>{STATUS_LABEL[detail.run.status]}</Badge></div>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">開始時間</p>
          <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">{formatTime(detail.run.startedAt)}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">AI tokens</p>
          <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">{detail.run.totalTokens.toLocaleString("en-US")}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">估算成本</p>
          <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">US${detail.run.costUsd.toFixed(4)}</p>
        </Card>
      </div>

      {detail.run.errorDetail ? (
        <Card className="mb-5 border-red-200 dark:border-red-900/50">
          <p className="text-xs font-semibold text-red-500">錯誤內容</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">{detail.run.errorDetail}</p>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">流程步驟（{detail.steps.length}）</h2>
          <ol className="mt-3 space-y-3">
            {detail.steps.length === 0 ? <li className="text-sm text-neutral-400">沒有步驟紀錄</li> : null}
            {detail.steps.map((step) => (
              <li key={step.id} className="text-sm">
                <p className="font-mono text-xs text-neutral-400">{step.nodeId} · {step.status}</p>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-200">{step.outputSummary ?? step.inputSummary ?? "沒有摘要"}</p>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">產出（{detail.artifacts.length}）</h2>
          <ul className="mt-3 space-y-3">
            {detail.artifacts.length === 0 ? <li className="text-sm text-neutral-400">沒有產出紀錄</li> : null}
            {detail.artifacts.map((artifact) => (
              <li key={artifact.id}>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{artifact.title}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{artifact.kind}</p>
                {artifact.content ? <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-300">{artifact.content}</p> : null}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">AI 用量（{detail.usage.length}）</h2>
          <ul className="mt-3 space-y-3">
            {detail.usage.length === 0 ? <li className="text-sm text-neutral-400">沒有可歸屬的 AI 用量</li> : null}
            {detail.usage.map((usage, index) => (
              <li key={`${usage.operation}-${usage.createdAt}-${index}`} className="text-sm">
                <p className="font-medium text-neutral-800 dark:text-neutral-100">{usage.operation}</p>
                <p className="mt-0.5 text-xs text-neutral-400">{usage.model} · {usage.totalTokens.toLocaleString("en-US")} tokens · US${usage.costUsd.toFixed(4)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
