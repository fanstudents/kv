"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RotateCw, Clock, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AGENTS } from "@/lib/agent-data";

// 執行紀錄：agent_runs / agent_run_steps / agent_artifacts / ai_usage_logs 的讀取端。
//
// 這四張表一直在寫，但後台沒有任何一頁看得到——等於裝了黑盒子紀錄器卻沒有讀取的螢幕。
// 這一頁回答的就是那三個原本答不出來的問題：
//   這份產出是哪一次執行做的？走過哪些流程節點？花了多少錢？

interface RunRow {
  id: string;
  agent_slug: string;
  trigger: string;
  trigger_ref: string | null;
  status: "running" | "success" | "failed" | "waiting" | "cancelled";
  started_at: string;
  ended_at: string | null;
  cost_usd: number;
  total_tokens: number;
  summary: string | null;
  error_kind: string | null;
  error_detail: string | null;
  retry_count: number;
  next_retry_at: string | null;
  parent_run_id: string | null;
  meta: Record<string, unknown>;
}

interface StepRow {
  id: string;
  node_id: string;
  seq: number;
  status: string;
  input_summary: string | null;
  output_summary: string | null;
  duration_ms: number | null;
  started_at: string;
}

interface ArtifactRow {
  id: string;
  kind: string;
  title: string;
  content: string | null;
  uri: string | null;
  created_at: string;
}

interface UsageRow {
  operation: string;
  model: string;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
}

interface Detail {
  run: RunRow;
  steps: StepRow[];
  artifacts: ArtifactRow[];
  usage: UsageRow[];
}

const STATUS_TONE: Record<RunRow["status"], "success" | "danger" | "warning" | "neutral"> = {
  success: "success",
  failed: "danger",
  running: "warning",
  waiting: "warning",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<RunRow["status"], string> = {
  success: "成功",
  failed: "失敗",
  running: "執行中",
  waiting: "等待中",
  cancelled: "已取消",
};

const TRIGGER_LABEL: Record<string, string> = {
  schedule: "排程",
  webhook: "外部事件",
  manual: "手動",
  agent: "隊友委派",
};

const ERROR_KIND_LABEL: Record<string, string> = {
  external: "外部服務",
  data: "資料／設定",
  model: "模型",
  timeout: "逾時",
  unknown: "未分類",
};

function agentName(slug: string): string {
  const a = AGENTS.find((x) => x.slug === slug);
  return a ? `${a.personZh}（${a.name}）` : slug;
}

function usd(n: number): string {
  const v = Number(n) || 0;
  if (v === 0) return "—";
  return `$${v.toFixed(v < 1 ? 4 : 2)}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(run: RunRow): string {
  if (!run.ended_at) return "進行中";
  const ms = new Date(run.ended_at).getTime() - new Date(run.started_at).getTime();
  if (ms < 1000) return `${ms} 毫秒`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} 秒`;
  return `${Math.round(ms / 60_000)} 分鐘`;
}

export default function RunsPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [retrying, setRetrying] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (agentFilter) params.set("agent", agentFilter);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/runs?${params}`)
      .then((res) => (res.ok ? res.json() : { runs: [] }))
      .then((d) => setRuns(d.runs ?? []))
      .catch(() => setRuns([]))
      .finally(() => setLoaded(true));
  }, [agentFilter, statusFilter]);

  useEffect(load, [load]);

  const toggle = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!details[id]) {
      fetch(`/api/runs/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d: Detail | null) => {
          if (d) setDetails((prev) => ({ ...prev, [id]: d }));
        })
        .catch(() => {});
    }
  };

  const retry = async (id: string) => {
    setRetrying(id);
    setNotice("");
    try {
      const res = await fetch(`/api/runs/${id}/retry`, { method: "POST" });
      const data = await res.json();
      setNotice(
        res.ok
          ? data.status === "success"
            ? "重跑成功，清單已更新"
            : `重跑未執行：${data.detail ?? "未知原因"}`
          : data.error ?? "重跑失敗"
      );
      load();
    } catch {
      setNotice("重跑失敗：連線錯誤");
    } finally {
      setRetrying(null);
    }
  };

  const failedCount = runs.filter((r) => r.status === "failed").length;
  const totalCost = runs.reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0);

  return (
    <>
      <PageHeader
        title="執行紀錄"
        description="每一次執行走過哪些流程節點、產出什麼、花了多少錢——排程、外部事件、對話與隊友委派都在這裡"
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RotateCw size={14} />
            重新整理
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">全部成員</option>
          {AGENTS.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.personZh}（{a.name}）
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">全部狀態</option>
          <option value="success">成功</option>
          <option value="failed">失敗</option>
          <option value="running">執行中</option>
          <option value="waiting">等待中</option>
          <option value="cancelled">已取消</option>
        </select>

        <span className="ml-auto text-sm text-neutral-500 dark:text-neutral-400">
          {runs.length} 次執行
          {failedCount > 0 && <span className="ml-2 text-red-500">· {failedCount} 次失敗</span>}
          <span className="ml-2">· 合計 {usd(totalCost)}</span>
        </span>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg bg-neutral-100 px-4 py-2.5 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {notice}
        </div>
      )}

      <Card className="p-0">
        {!loaded ? (
          <p className="p-6 text-sm text-neutral-400">載入中…</p>
        ) : runs.length === 0 ? (
          <p className="p-6 text-sm text-neutral-400">
            還沒有執行紀錄。排程跑過、有外部事件進來，或在聊天視窗跟 Agent 說話之後就會出現。
          </p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {runs.map((run) => {
              const detail = details[run.id];
              const open = expanded === run.id;
              const replayable = Boolean(run.meta?.replay);

              return (
                <Fragment key={run.id}>
                  <button
                    type="button"
                    onClick={() => toggle(run.id)}
                    className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <span className="mt-0.5 text-neutral-400">
                      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {agentName(run.agent_slug)}
                        </span>
                        <Badge tone={STATUS_TONE[run.status]}>{STATUS_LABEL[run.status]}</Badge>
                        <Badge>{TRIGGER_LABEL[run.trigger] ?? run.trigger}</Badge>
                        {run.retry_count > 0 && <Badge tone="warning">已重試 {run.retry_count} 次</Badge>}
                        {run.parent_run_id && <Badge tone="warning">補救執行</Badge>}
                      </span>

                      <span className="mt-1 block truncate text-sm text-neutral-500 dark:text-neutral-400">
                        {run.summary ?? run.error_detail ?? "（沒有摘要）"}
                      </span>
                    </span>

                    <span className="shrink-0 text-right text-xs text-neutral-400">
                      <span className="block">{timeLabel(run.started_at)}</span>
                      <span className="block">
                        {duration(run)} · {usd(run.cost_usd)}
                      </span>
                    </span>
                  </button>

                  {open && (
                    <div className="bg-neutral-50 px-5 py-4 dark:bg-neutral-900/60">
                      {run.status === "failed" && (
                        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                          <p className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                            <AlertTriangle size={14} />
                            {ERROR_KIND_LABEL[run.error_kind ?? "unknown"] ?? run.error_kind}錯誤
                          </p>
                          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                            {run.error_detail ?? "沒有留下錯誤細節"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {run.next_retry_at && (
                              <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                <Clock size={12} />
                                {timeLabel(run.next_retry_at)} 自動重試
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={!replayable || retrying === run.id}
                              onClick={() => retry(run.id)}
                              title={replayable ? undefined : "這次執行沒有登記可重放的工作"}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                            >
                              <RotateCw size={12} className={retrying === run.id ? "animate-spin" : ""} />
                              {retrying === run.id ? "重跑中…" : "立即重跑"}
                            </button>
                          </div>
                        </div>
                      )}

                      {!detail ? (
                        <p className="text-sm text-neutral-400">載入細節中…</p>
                      ) : (
                        <div className="grid gap-5 lg:grid-cols-3">
                          <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                              流程節點（{detail.steps.length}）
                            </h3>
                            {detail.steps.length === 0 ? (
                              <p className="text-sm text-neutral-400">這次執行沒有回報節點</p>
                            ) : (
                              <ol className="space-y-1.5">
                                {detail.steps.map((s) => (
                                  <li key={s.id} className="text-sm">
                                    <span className="font-mono text-xs text-neutral-500">{s.node_id}</span>
                                    <span className="ml-2 text-neutral-700 dark:text-neutral-200">
                                      {s.output_summary ?? s.input_summary ?? s.status}
                                    </span>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </section>

                          <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                              產出（{detail.artifacts.length}）
                            </h3>
                            {detail.artifacts.length === 0 ? (
                              <p className="text-sm text-neutral-400">這次執行沒有留下產出</p>
                            ) : (
                              <ul className="space-y-2">
                                {detail.artifacts.map((a) => (
                                  <li key={a.id}>
                                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                      {a.title}
                                      <span className="ml-2 text-xs font-normal text-neutral-400">{a.kind}</span>
                                    </p>
                                    {a.content && (
                                      <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-neutral-500">
                                        {a.content}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </section>

                          <section>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                              AI 花費（{usd(run.cost_usd)} / {run.total_tokens.toLocaleString("en-US")} tokens）
                            </h3>
                            {detail.usage.length === 0 ? (
                              <p className="text-sm text-neutral-400">這次執行沒有呼叫 AI</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {detail.usage.map((u, i) => (
                                  <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="truncate text-neutral-700 dark:text-neutral-200">
                                      {u.operation}
                                      <span className="ml-1.5 text-xs text-neutral-400">{u.model}</span>
                                    </span>
                                    <span className="shrink-0 font-mono text-xs text-neutral-500">
                                      {usd(u.cost_usd)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </section>
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
