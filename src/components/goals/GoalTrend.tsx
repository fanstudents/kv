"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { usePrefersDark } from "@/components/agents/charts/TrendChart";
import { useMetricHistory } from "@/lib/goal-history";
import { formatGoalValue, type GoalUnit } from "@/lib/agent-goals";

// 目標卡片上的迷你趨勢線：從 metric_snapshots 的每日快照畫出來，
// 讓達成率從「現在幾分」多一眼「怎麼走過來的」。
// 快照是 P1 才開始寫的（見 /api/cron/metric-snapshot），所以剛上線那幾天
// 資料點會很少——不足 2 筆就不畫線，顯示「還在累積資料」比畫一條假趨勢誠實。

export default function GoalTrend({
  metricId,
  unit,
  color,
  days = 30,
  width = 88,
  height = 32,
}: {
  metricId: string;
  unit: GoalUnit;
  color: string;
  days?: number;
  width?: number;
  height?: number;
}) {
  const { points, loading } = useMetricHistory(metricId, days);
  const dark = usePrefersDark();

  if (loading) {
    return <span style={{ width, height }} className="block shrink-0 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />;
  }

  if (points.length < 2) {
    return (
      <span
        style={{ width }}
        className="shrink-0 text-right text-[10px] leading-tight text-neutral-300 dark:text-neutral-600"
      >
        累積資料中
      </span>
    );
  }

  const data = points.map((p) => ({
    value: p.value,
    date: new Date(p.captured_at).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" }),
  }));

  return (
    <div style={{ width, height }} className="shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            formatter={(value) => [formatGoalValue(unit, Number(value)), "數值"]}
            labelFormatter={(label) => label}
            contentStyle={{
              background: dark ? "#171717" : "#ffffff",
              border: `1px solid ${dark ? "#262626" : "#e5e5e5"}`,
              borderRadius: 8,
              fontSize: 11,
              padding: "4px 8px",
            }}
            labelStyle={{ color: dark ? "#a3a3a3" : "#737373", fontSize: 10 }}
            itemStyle={{ color: dark ? "#e5e5e5" : "#262626" }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
