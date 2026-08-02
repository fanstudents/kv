"use client";

import { useMemo, useState } from "react";
import { Info, Plus, RotateCcw, Target } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Avatar from "@/components/agents/Avatar";
import GoalBar from "@/components/goals/GoalBar";
import GoalDialog from "@/components/goals/GoalDialog";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { GOAL_STATUS_META, goalProgress, type AgentGoal, type GoalStatus } from "@/modules/goals/model";
import { removeGoal, resetGoals, useAgentGoals } from "@/components/goals/use-agent-goals";
import { useMarketingMode } from "@/lib/marketing-mode";
import { useDemoMode } from "@/lib/demo-mode";
import type { AgentSlug } from "@/lib/types";

// 目標達成率總覽：一眼看到全隊每位 Agent 背了什麼目標、走到哪、有沒有落後。
// 目標本身由指揮官在這裡設定（GoalDialog），存在瀏覽器端；達成率則對照各 Agent
// 頁面正在用的同一份數據來源計算，所以這裡的數字跟他們自己的頁面對得起來。

const FILTERS: { key: "all" | GoalStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "achieved", label: "已達標" },
  { key: "on-track", label: "進度超前" },
  { key: "at-risk", label: "需要加把勁" },
  { key: "behind", label: "落後" },
  { key: "expired", label: "已逾期" },
];

/** 達成率圓環（總覽數字用） */
function Ring({ value, size = 84, color = "#06C755" }: { value: number; size?: number; color?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={7} className="stroke-neutral-200 dark:stroke-neutral-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={7}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <span className="absolute font-mono text-base font-semibold text-neutral-900 dark:text-white">
        {Math.round(value * 100)}%
      </span>
    </span>
  );
}

export default function GoalsPage() {
  const goals = useAgentGoals();
  const [marketingMode] = useMarketingMode();
  const [demoMode] = useDemoMode();
  const [filter, setFilter] = useState<"all" | GoalStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AgentGoal | null>(null);
  const [lockedAgent, setLockedAgent] = useState<AgentSlug | undefined>(undefined);

  const visibleAgents = useMemo(
    () => (marketingMode ? AGENTS.filter((a) => agentTeam(a.slug) === "marketing") : AGENTS),
    [marketingMode]
  );
  const visibleSlugs = useMemo(() => new Set(visibleAgents.map((a) => a.slug)), [visibleAgents]);

  // 每筆目標算好進度，之後的統計與分組都吃這份
  const scored = useMemo(
    () =>
      goals
        .filter((g) => visibleSlugs.has(g.agentSlug))
        .map((goal) => ({ goal, progress: goalProgress(goal) }))
        .filter((x): x is { goal: AgentGoal; progress: NonNullable<ReturnType<typeof goalProgress>> } => x.progress !== null),
    [goals, visibleSlugs]
  );

  const stats = useMemo(() => {
    const count = (s: GoalStatus) => scored.filter((x) => x.progress.status === s).length;
    const avg = scored.length
      ? scored.reduce((sum, x) => sum + Math.min(1, Math.max(0, x.progress.ratio)), 0) / scored.length
      : 0;
    return {
      total: scored.length,
      achieved: count("achieved"),
      onTrack: count("on-track"),
      attention: count("at-risk") + count("behind"),
      expired: count("expired"),
      avg,
    };
  }, [scored]);

  const filtered = useMemo(
    () => (filter === "all" ? scored : scored.filter((x) => x.progress.status === filter)),
    [scored, filter]
  );

  const openNew = (slug?: AgentSlug) => {
    setEditing(null);
    setLockedAgent(slug);
    setDialogOpen(true);
  };
  const openEdit = (goal: AgentGoal) => {
    setEditing(goal);
    setLockedAgent(undefined);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="目標與達成率"
        description="幫每位 Agent 設定要背的目標，這裡就是全隊達成率的總覽——誰超前、誰落後，一眼看完"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                if (confirm("要把目標清單還原成預設的示範目標嗎？（自行設定的會被清掉）")) void resetGoals();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RotateCcw size={14} />
              還原示範目標
            </button>
            <button
              type="button"
              onClick={() => openNew()}
              className="flex items-center gap-1.5 rounded-lg bg-[#06C755] px-3.5 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={15} />
              設定目標
            </button>
          </>
        }
      />

      {/* 關掉示範模式時要說清楚：目標是你設定的沒錯，但「目前值」還沒接上真實資料來源 */}
      {!demoMode && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-xs leading-relaxed text-amber-700 dark:text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            示範模式已關閉。目標與期限是你實際設定的，但下方的「目前值」仍取自示範資料來源——
            接上 GSC／GA4／Meta 等真實串接後，達成率才會是實際數字。
          </span>
        </div>
      )}

      {/* 全隊總覽 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center gap-5">
          <Ring value={stats.avg} size={92} />
          <div>
            <p className="text-xs text-neutral-400">全隊平均達成率</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900 dark:text-white">
              {stats.total} 個進行中的目標
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              涵蓋 {new Set(scored.map((x) => x.goal.agentSlug)).size} 位 Agent
            </p>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              { label: "已達標", value: stats.achieved, color: GOAL_STATUS_META.achieved.color },
              { label: "進度超前", value: stats.onTrack, color: GOAL_STATUS_META["on-track"].color },
              { label: "需要留意", value: stats.attention, color: GOAL_STATUS_META["at-risk"].color },
              { label: "已逾期", value: stats.expired, color: GOAL_STATUS_META.expired.color },
            ] as const
          ).map((s) => (
            <Card key={s.label}>
              <p className="text-xs text-neutral-400">{s.label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold" style={{ color: s.color }}>
                {s.value}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* 狀態篩選 */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = f.key === "all" ? scored.length : scored.filter((x) => x.progress.status === f.key).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                  : "border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-neutral-400">{n}</span>
            </button>
          );
        })}
      </div>

      {/* 依 Agent 分組 */}
      <div className="space-y-4">
        {visibleAgents.map((agent) => {
          const mine = filtered.filter((x) => x.goal.agentSlug === agent.slug);
          const all = scored.filter((x) => x.goal.agentSlug === agent.slug);
          if (mine.length === 0 && filter !== "all") return null;

          const avg = all.length
            ? all.reduce((s, x) => s + Math.min(1, Math.max(0, x.progress.ratio)), 0) / all.length
            : 0;

          return (
            <Card key={agent.slug}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Avatar personEn={agent.personEn} color={agent.color} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {agent.personEn} <span className="text-neutral-400">{agent.personZh}</span>
                    <span className="ml-2 text-xs font-normal" style={{ color: agent.color }}>
                      {agent.role}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {all.length > 0 ? `背了 ${all.length} 個目標` : "還沒有設定目標"}
                  </p>
                </div>
                {all.length > 0 && <Ring value={avg} size={56} color={agent.color} />}
                <button
                  type="button"
                  onClick={() => openNew(agent.slug)}
                  className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Plus size={13} />
                  新增目標
                </button>
              </div>

              {mine.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-200 px-4 py-5 text-xs text-neutral-400 dark:border-neutral-700">
                  <Target size={14} />
                  {all.length === 0 ? "尚未設定目標——按右上角「新增目標」挑一個指標給他背。" : "這個篩選條件下沒有目標。"}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mine.map(({ goal }) => (
                    <GoalBar
                      key={goal.id}
                      goal={goal}
                      color={agent.color}
                      onEdit={openEdit}
                      onDelete={(g) => {
                        if (confirm("確定要刪除這個目標嗎？")) removeGoal(g.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <GoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        lockedAgent={lockedAgent}
      />
    </div>
  );
}
