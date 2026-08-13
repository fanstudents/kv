"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import TrendChart from "@/components/agents/charts/TrendChart";
import BreakdownBars from "@/components/agents/charts/BreakdownBars";
import StatTile from "@/components/agents/charts/StatTile";
import RangeToggle from "@/components/agents/charts/RangeToggle";
import { useAgentOverview } from "@/components/agents/overview-client";
import { buildSearchDemo } from "@/lib/gsc-demo";
import { useDemoMode } from "@/lib/demo-mode";
import type { SearchOverview } from "@/lib/gsc";

const SEO_COLOR = "#14B8A6"; // 跟 Leo(SEO Agent)頭像色一致

// SEO 尖兵(Leo)用：示範模式保留固定資料；如實模式讀取真實 GSC overview API。
export default function SeoOverviewPanel() {
  const [days, setDays] = useState(7);
  const [demoMode] = useDemoMode();
  const live = useAgentOverview<SearchOverview>(
    demoMode ? null : `/api/agents/expense/seo-overview?days=${days}`,
  );
  const data = demoMode ? buildSearchDemo(days) : live.data;

  const contentState = !data
    ? live.error
      ? "error"
      : "loading"
    : data.totalClicks === 0 &&
        data.totalImpressions === 0 &&
        data.dailyTrend.length === 0 &&
        data.topQueries.length === 0
      ? "empty"
      : "ready";

  const trendData = (data?.dailyTrend ?? []).map((d) => ({
    date: d.date.slice(5).replace("-", "/"),
    clicks: d.clicks,
  }));

  const topQueries = (data?.topQueries ?? []).slice(0, 6).map((q) => ({
    label: q.query || "(未分類)",
    value: q.clicks,
    color: SEO_COLOR,
  }));

  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">SEO 成效(近 {days} 天)</h2>
        <div className="flex items-center gap-2">
          <RangeToggle value={days} onChange={setDays} />
          <span className="text-xs text-neutral-400">來源:Google Search Console</span>
        </div>
      </div>

      {contentState === "loading" && (
        <div aria-label="GSC 資料載入中" className="h-64 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
      )}

      {contentState === "error" && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          GSC 真實資料讀取失敗：{live.error}
        </p>
      )}

      {contentState === "empty" && (
        <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-700">
          所選期間沒有 Search Console 資料
        </p>
      )}

      {contentState === "ready" && data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="總點擊次數"
              value={data.totalClicks.toLocaleString("en-US")}
              delta={data.clicksDelta}
              hint={`較前 ${days} 天`}
            />
            <StatTile label="總曝光次數" value={data.totalImpressions.toLocaleString("en-US")} />
            <StatTile label="平均 CTR" value={`${(data.avgCtr * 100).toFixed(1)}%`} />
            <StatTile
              label="平均排名"
              value={data.avgPosition.toFixed(1)}
              delta={data.positionDelta}
              hint="正值＝名次進步"
            />
          </div>

          <p className="mb-2 text-xs font-medium text-neutral-500">每日點擊趨勢(近 {days} 天)</p>
          <TrendChart data={trendData} xKey="date" series={[{ key: "clicks", name: "點擊", color: SEO_COLOR }]} />

          {topQueries.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-neutral-500">熱門關鍵字策略與排名(依點擊排序)</p>
              <BreakdownBars items={topQueries} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}
