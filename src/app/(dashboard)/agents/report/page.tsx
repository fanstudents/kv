"use client";

import { useCallback, useState } from "react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput, Select } from "@/components/ui/Field";

const agent = getAgent("report")!;

const ALL_METRICS = ["問卷開始數", "問卷完成數", "問卷完成率", "訂閱數", "訂閱轉換率", "訂閱金額"];

export default function ReportAgentPage() {
  const [frequency, setFrequency] = useState("monthly");
  const [sendTime, setSendTime] = useState("15:30");
  const [recipient, setRecipient] = useState("行銷團隊");
  const [metrics, setMetrics] = useState<string[]>(ALL_METRICS);
  const [includeSuggestion, setIncludeSuggestion] = useState(true);

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (typeof s.frequency === "string") setFrequency(s.frequency);
    if (typeof s.sendTime === "string") setSendTime(s.sendTime);
    if (typeof s.recipient === "string") setRecipient(s.recipient);
    if (Array.isArray(s.metrics)) setMetrics(s.metrics as string[]);
    if (typeof s.includeSuggestion === "boolean") setIncludeSuggestion(s.includeSuggestion);
  }, []);

  const toggleMetric = (m: string) => {
    setMetrics((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const kpiValues: Record<string, string> = {
    問卷開始數: "4,380",
    問卷完成數: "2,760",
    問卷完成率: "63.0%",
    訂閱數: "958",
    訂閱轉換率: "34.7%",
    訂閱金額: "NT$1,149,600",
  };

  const reportLabel = frequency === "daily" ? "日" : frequency === "weekly" ? "週" : "月";
  const previewText = `【${reportLabel}報】本月訂閱轉換${reportLabel}報\n${metrics
    .map((m) => `${m}: ${kpiValues[m]}`)
    .join("\n")}${includeSuggestion ? "\n\n行動建議：問卷完成率穩定在 63%，可 A/B 測試更短版問卷，目標拉到 70%。" : ""}`;

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.report}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      settings={{ frequency, sendTime, recipient, metrics, includeSuggestion }}
      settingsForm={
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="寄送頻率">
              <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="daily">每日</option>
                <option value="weekly">每週</option>
                <option value="monthly">每月</option>
              </Select>
            </Field>
            <Field label="寄送時間">
              <TextInput type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} />
            </Field>
            <Field label="寄送對象（LINE 群組）">
              <TextInput value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </Field>
          </div>

          <Field label="報表涵蓋指標">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_METRICS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={metrics.includes(m)}
                    onChange={() => toggleMetric(m)}
                    className="h-4 w-4 rounded border-neutral-300 text-[#06C755] focus:ring-[#06C755]"
                  />
                  {m}
                </label>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={includeSuggestion}
              onChange={(e) => setIncludeSuggestion(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-[#06C755] focus:ring-[#06C755]"
            />
            附加 AI 行動建議
          </label>
        </div>
      }
    />
  );
}
