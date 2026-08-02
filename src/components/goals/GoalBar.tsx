"use client";

import { Pencil, Trash2 } from "lucide-react";
import BrandLogo from "@/components/integrations/BrandLogo";
import GoalTrend from "@/components/goals/GoalTrend";
import {
  CADENCE_LABEL,
  GOAL_STATUS_META,
  formatGoalValue,
  goalProgress,
  type AgentGoal,
} from "@/modules/goals/model";

// 一筆目標的橫條呈現：目標類型、目前值 / 目標值、達成率長條，
// 長條上還有一根「時間進度」刻度——過了多少時間就該走到哪裡，一眼看出超前或落後。

export default function GoalBar({
  goal,
  color,
  onEdit,
  onDelete,
  compact = false,
}: {
  goal: AgentGoal;
  /** 負責這個目標的 Agent 代表色 */
  color: string;
  onEdit?: (goal: AgentGoal) => void;
  onDelete?: (goal: AgentGoal) => void;
  compact?: boolean;
}) {
  const p = goalProgress(goal);
  if (!p) return null;

  const { metric, current, ratio, timeRatio, daysLeft, status, remaining } = p;
  const meta = GOAL_STATUS_META[status];
  const pct = Math.max(0, Math.min(1, ratio));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <BrandLogo brand={metric.brand ?? metric.category} name={metric.source} color={color} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {metric.label}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.tone}`}>{meta.label}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-400">
            {metric.source} · {CADENCE_LABEL[goal.cadence]} · 期限 {goal.dueDate}
            {daysLeft >= 0 ? `（剩 ${daysLeft} 天）` : `（逾期 ${-daysLeft} 天）`}
          </p>
        </div>
        {!compact && <GoalTrend metricId={goal.metricId} unit={metric.unit} color={meta.color} />}
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-semibold leading-none text-neutral-900 dark:text-white">
            {Math.round(ratio * 100)}%
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">達成率</p>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(goal)}
                title="編輯目標"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(goal)}
                title="刪除目標"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 進度條：填色＝實際達成率，虛線刻度＝時間進度（該走到哪） */}
      <div className="relative mt-3 h-2.5 overflow-visible rounded-full bg-neutral-100 dark:bg-neutral-800">
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
          style={{
            width: `${pct * 100}%`,
            background: `linear-gradient(90deg, ${color}99, ${meta.color})`,
          }}
        />
        <span
          className="absolute -top-1 h-4.5 w-px bg-neutral-400 dark:bg-neutral-500"
          style={{ left: `${timeRatio * 100}%`, height: "1.125rem" }}
          title={`時間已過 ${Math.round(timeRatio * 100)}%`}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400">
        <span>
          目前{" "}
          <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">
            {formatGoalValue(metric.unit, current)}
          </span>
        </span>
        <span>
          目標{" "}
          <span className="font-mono font-semibold" style={{ color }}>
            {formatGoalValue(metric.unit, goal.target)}
          </span>
        </span>
        {remaining > 0 && (
          <span>
            還差 <span className="font-mono">{formatGoalValue(metric.unit, remaining)}</span>
          </span>
        )}
        <span className="text-neutral-300 dark:text-neutral-600">時間已過 {Math.round(timeRatio * 100)}%</span>
      </div>

      {!compact && goal.note && (
        <p className="mt-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
          {goal.note}
        </p>
      )}
    </div>
  );
}
