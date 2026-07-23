"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import TrendChart from "@/components/agents/charts/TrendChart";
import BreakdownBars from "@/components/agents/charts/BreakdownBars";
import StatTile from "@/components/agents/charts/StatTile";
import RangeToggle from "@/components/agents/charts/RangeToggle";
import type { TrafficOverview } from "@/lib/ga4";

const GA4_COLOR = "#3B82F6"; // 跟 Ivy(數據 Agent)頭像色一致

// 固定的渠道→顏色對照:同一個渠道名稱永遠同一個顏色,不會因為排序變動而換色。
const CHANNEL_COLORS: Record<string, string> = {
  "Direct": "#2a78d6",
  "Organic Search": "#1baf7a",
  "Paid Search": "#eb6834",
  "Organic Social": "#4a3aa7",
  "Paid Social": "#e87ba4",
  Referral: "#eda100",
  Email: "#eda100",
};
const FALLBACK_CHANNEL_COLOR = "#94a3b8";

// 數據助理(Ivy)用:真實 GA4 近 14 天流量——重點數字、每日工作階段趨勢、渠道拆分。
export default function TrafficOverviewPanel() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<TrafficOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/agents/report/traffic-overview?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok) setData(d.data as TrafficOverview);
        else setError(d.error ?? "讀取失敗");
      })
      .catch(() => alive && setError("讀取失敗"));
    return () => {
      alive = false;
    };
  }, [days]);

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">GA4 真實流量(近 {days} 天)</h2>
      <div className="flex items-center gap-2">
        <RangeToggle value={days} onChange={setDays} />
        <span className="text-xs text-neutral-400">來源:Google Analytics 4</span>
      </div>
    </div>
  );

  if (error) {
    return (
      <Card className="mb-6">
        {header}
        <p className="text-sm text-amber-700 dark:text-amber-400">GA4 真實資料讀取失敗:{error}</p>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card className="mb-6">
        {header}
        <div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
      </Card>
    );
  }

  const trendData = data.dailyTrend.map((d) => ({
    date: d.date.slice(5).replace("-", "/"),
    sessions: d.sessions,
  }));

  const channels = data.byChannel.map((c) => ({
    label: c.channel || "(未分類)",
    value: c.sessions,
    color: CHANNEL_COLORS[c.channel] ?? FALLBACK_CHANNEL_COLOR,
  }));

  return (
    <Card className="mb-6">
      {header}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="工作階段"
          value={data.sessions.toLocaleString("en-US")}
          delta={data.sessionsDelta}
          hint={`較前 ${days} 天`}
        />
        <StatTile label="不重複使用者" value={data.activeUsers.toLocaleString("en-US")} />
        <StatTile label="轉換數" value={data.conversions.toLocaleString("en-US")} />
      </div>

      <p className="mb-2 text-xs font-medium text-neutral-500">每日工作階段趨勢(近 {days} 天)</p>
      <TrendChart data={trendData} xKey="date" series={[{ key: "sessions", name: "工作階段", color: GA4_COLOR }]} />

      {channels.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-neutral-500">渠道拆分(依工作階段排序)</p>
          <BreakdownBars items={channels} />
        </div>
      )}
    </Card>
  );
}
