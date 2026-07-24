"use client";

import { useMemo, useState } from "react";
import { Check, Target, X } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import BrandLogo from "@/components/integrations/BrandLogo";
import { AGENTS } from "@/lib/agent-data";
import {
  CADENCE_LABEL,
  GOAL_CATEGORIES,
  defaultDueDate,
  formatGoalValue,
  metricOf,
  metricsForAgent,
  type AgentGoal,
  type GoalCadence,
} from "@/lib/agent-goals";
import { newGoalId, saveGoal } from "@/lib/agent-goals-store";
import type { AgentSlug } from "@/lib/types";

// 設定目標的介面：三步——先挑人、再挑「目標類型」（依資料來源分類，不用自己編欄位）、
// 最後填目標值與期限。編輯既有目標時直接帶入原值。

const CADENCES: GoalCadence[] = ["once", "weekly", "monthly", "quarterly"];

export default function GoalDialog({
  open,
  onClose,
  editing,
  lockedAgent,
}: {
  open: boolean;
  onClose: () => void;
  /** 有值＝編輯模式 */
  editing?: AgentGoal | null;
  /** 在單一 Agent 頁面開啟時鎖定負責人 */
  lockedAgent?: AgentSlug;
}) {
  // 關閉時整個卸載，重新打開就是全新的表單——初始值直接用 useState 初始化，
  // 不必再寫一支「開啟時重設欄位」的 effect。
  if (!open) return null;
  return <GoalForm onClose={onClose} editing={editing ?? null} lockedAgent={lockedAgent} />;
}

function GoalForm({
  onClose,
  editing,
  lockedAgent,
}: {
  onClose: () => void;
  editing: AgentGoal | null;
  lockedAgent?: AgentSlug;
}) {
  const initialSlug = editing?.agentSlug ?? lockedAgent ?? "expense";
  const initialMetric = editing ? metricOf(editing.metricId) : metricsForAgent(initialSlug)[0];

  const [agentSlug, setAgentSlug] = useState<AgentSlug>(initialSlug);
  const [metricId, setMetricId] = useState(initialMetric?.id ?? "gsc-clicks");
  const [category, setCategory] = useState<string>("建議給這位");
  const [target, setTarget] = useState(String(editing?.target ?? initialMetric?.defaultTarget ?? 0));
  const [startValue, setStartValue] = useState(
    String(editing?.startValue ?? (initialMetric?.direction === "down" ? initialMetric.current : 0))
  );
  const [cadence, setCadence] = useState<GoalCadence>(editing?.cadence ?? "monthly");
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? defaultDueDate("monthly"));
  const [note, setNote] = useState(editing?.note ?? "");

  const agent = AGENTS.find((a) => a.slug === agentSlug) ?? AGENTS[0];
  const suggested = useMemo(() => metricsForAgent(agentSlug), [agentSlug]);
  const listed = useMemo(
    () =>
      category === "建議給這位"
        ? suggested.filter((m) => m.agents.includes(agentSlug))
        : suggested.filter((m) => m.category === category),
    [category, suggested, agentSlug]
  );
  const metric = metricOf(metricId);

  const pickAgent = (slug: AgentSlug) => {
    setAgentSlug(slug);
    if (category === "建議給這位") {
      const first = metricsForAgent(slug).filter((m) => m.agents.includes(slug))[0];
      if (first) pickMetric(first.id);
    }
  };

  const pickMetric = (id: string) => {
    setMetricId(id);
    const m = metricOf(id);
    if (!m) return;
    setTarget(String(m.defaultTarget));
    setStartValue(String(m.direction === "down" ? m.current : 0));
  };

  const pickCadence = (c: GoalCadence) => {
    setCadence(c);
    setDueDate(defaultDueDate(c));
  };

  const submit = () => {
    if (!metric) return;
    const goal: AgentGoal = {
      id: editing?.id ?? newGoalId(),
      agentSlug,
      metricId,
      target: Number(target) || 0,
      startValue: Number(startValue) || 0,
      startDate: editing?.startDate ?? new Date().toISOString().slice(0, 10),
      dueDate,
      cadence,
      note: note.trim() || undefined,
    };
    saveGoal(goal);
    onClose();
  };

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="關閉" onClick={onClose} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2.5 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755]/12 text-[#06C755]">
            <Target size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {editing ? "編輯目標" : "為 Agent 設定目標"}
            </h2>
            <p className="text-xs text-neutral-400">選一位負責人、挑一種目標類型，設定要在什麼時候達成多少</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="關閉"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* 1. 負責的 Agent */}
          {!lockedAgent && (
            <section>
              <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">1 · 誰負責這個目標</p>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map((a) => (
                  <button
                    key={a.slug}
                    type="button"
                    onClick={() => pickAgent(a.slug)}
                    className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      a.slug === agentSlug
                        ? "border-transparent text-white"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                    style={a.slug === agentSlug ? { background: a.color } : undefined}
                  >
                    <Avatar personEn={a.personEn} color={a.color} size={20} ring={false} />
                    {a.personEn}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 2. 目標類型 */}
          <section>
            <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {lockedAgent ? "1" : "2"} · 目標類型（資料從哪裡來）
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {["建議給這位", ...GOAL_CATEGORIES].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                    category === c
                      ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                      : "border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  {c === "建議給這位" ? `建議給 ${agent.personEn}` : c}
                </button>
              ))}
            </div>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {listed.length === 0 && (
                <p className="col-span-full rounded-lg border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400 dark:border-neutral-700">
                  這個分類目前沒有指標，換一個分類看看
                </p>
              )}
              {listed.map((m) => {
                const selected = m.id === metricId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => pickMetric(m.id)}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                      selected
                        ? "border-[#06C755] bg-[#06C755]/[0.06]"
                        : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      <BrandLogo brand={m.brand ?? m.category} name={m.source} color={agent.color} size={26} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                        {m.label}
                        {selected && <Check size={12} className="text-[#06C755]" />}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-neutral-400">{m.hint}</span>
                      <span className="mt-1 block text-[10px] text-neutral-400">
                        {m.source} · 目前 {formatGoalValue(m.unit, m.current)} ·{" "}
                        {m.direction === "up" ? "越高越好" : "越低越好"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. 目標值與期限 */}
          {metric && (
            <section>
              <p className="mb-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {lockedAgent ? "2" : "3"} · 要達成多少、什麼時候前
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-neutral-500 dark:text-neutral-400">
                    目標值（{metric.label}）
                  </span>
                  <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-neutral-500 dark:text-neutral-400">
                    起始基準值（算達成率的起點）
                  </span>
                  <input
                    type="number"
                    value={startValue}
                    onChange={(e) => setStartValue(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-neutral-500 dark:text-neutral-400">期限</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <div>
                  <span className="mb-1 block text-[11px] text-neutral-500 dark:text-neutral-400">週期</span>
                  <div className="flex flex-wrap gap-1.5">
                    {CADENCES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pickCadence(c)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                          cadence === c
                            ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                            : "border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {CADENCE_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] text-neutral-500 dark:text-neutral-400">備註（選填）</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：先砍疲勞受眾再談加碼"
                  className={inputClass}
                />
              </label>

              {/* 一句話預覽：確認設定的意思正確 */}
              <p className="mt-3 rounded-xl border border-[#06C755]/30 bg-[#06C755]/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-neutral-700 dark:text-neutral-200">
                <span className="font-semibold" style={{ color: agent.color }}>
                  {agent.personEn} {agent.personZh}
                </span>{" "}
                要讓「{metric.label}」在 <span className="font-semibold">{dueDate}</span> 前從{" "}
                {formatGoalValue(metric.unit, Number(startValue) || 0)}{" "}
                {metric.direction === "up" ? "提升" : "降低"}到{" "}
                <span className="font-semibold">{formatGoalValue(metric.unit, Number(target) || 0)}</span>
                （目前 {formatGoalValue(metric.unit, metric.current)}）
              </p>
            </section>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-[#06C755] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {editing ? "儲存變更" : "建立目標"}
          </button>
        </div>
      </div>
    </div>
  );
}
