"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendSeries {
  key: string;
  name: string;
  color: string;
}

function usePrefersDark() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark;
}

// 共用趨勢圖(面積圖):1 個數列就不畫圖例(只有一種顏色,標題已經說明是什麼);
// 2 個數列則在上方畫色點 + 文字的圖例,不讓人只能靠顏色配對。
export default function TrendChart({
  data,
  xKey,
  series,
  height = 200,
  valueFormatter = (v: number) => v.toLocaleString("en-US"),
  forceDark,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: TrendSeries[];
  height?: number;
  valueFormatter?: (v: number) => string;
  /** 強制走深色配色,不管系統色彩模式——給劇場模式這種永遠是暗色底的畫面用 */
  forceDark?: boolean;
}) {
  const systemDark = usePrefersDark();
  const dark = forceDark ?? systemDark;
  const gridColor = dark ? "#262626" : "#e5e5e5";
  const axisColor = dark ? "#737373" : "#a3a3a3";
  const tooltipBg = dark ? "#171717" : "#ffffff";
  const tooltipBorder = dark ? "#262626" : "#e5e5e5";
  const tooltipText = dark ? "#e5e5e5" : "#262626";

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3">
          {series.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-1.5 text-[11px]"
              style={{ color: dark ? "#a3a3a3" : "#737373" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`trend-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
            />
            <Tooltip
              formatter={(value, name) => [valueFormatter(Number(value)), String(name)]}
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 8,
                fontSize: 12,
                color: tooltipText,
              }}
              labelStyle={{ color: axisColor, fontSize: 11, marginBottom: 2 }}
            />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#trend-fill-${s.key})`}
                dot={false}
                activeDot={{ r: 4, stroke: tooltipBg, strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
