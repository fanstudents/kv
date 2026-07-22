"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import TrendChart from "@/components/agents/charts/TrendChart";
import BreakdownBars from "@/components/agents/charts/BreakdownBars";
import StatTile from "@/components/agents/charts/StatTile";
import type { SearchOverview } from "@/lib/gsc";

const SEO_COLOR = "#14B8A6"; // 跟 Leo(SEO Agent)頭像色一致

// SEO 助理(Leo)用:真實 Search Console 近 28 天成效——重點數字、每日點擊趨勢、熱門關鍵字。
export default function SeoOverviewPanel() {
  const [data, setData] = useState<SearchOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/agents/expense/seo-overview")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok) setData(d.data as SearchOverview);
        else setError(d.error ?? "讀取失敗");
      })
      .catch(() => alive && setError("讀取失敗"));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <Card className="mb-6">
        <p className="text-sm text-amber-700 dark:text-amber-400">Search Console 真實資料讀取失敗:{error}</p>
      </Card>
    );
  }
  if (!data) {
    return <Card className="mb-6 h-64 animate-pulse" />;
  }

  const trendData = data.dailyTrend.map((d) => ({
    date: d.date.slice(5).replace("-", "/"),
    clicks: d.clicks,
  }));

  const topQueries = data.topQueries.slice(0, 6).map((q) => ({
    label: q.query || "(未分類)",
    value: q.clicks,
    color: SEO_COLOR,
  }));

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">SEO 真實成效(近 28 天)</h2>
        <span className="text-xs text-neutral-400">來源:Google Search Console</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="總點擊次數" value={data.totalClicks.toLocaleString("en-US")} delta={data.clicksDelta} hint="較前 28 天" />
        <StatTile label="總曝光次數" value={data.totalImpressions.toLocaleString("en-US")} />
        <StatTile label="平均 CTR" value={`${(data.avgCtr * 100).toFixed(1)}%`} />
        <StatTile
          label="平均排名"
          value={data.avgPosition.toFixed(1)}
          delta={data.positionDelta}
          hint="正值＝名次進步"
        />
      </div>

      <p className="mb-2 text-xs font-medium text-neutral-500">每日點擊趨勢</p>
      <TrendChart data={trendData} xKey="date" series={[{ key: "clicks", name: "點擊", color: SEO_COLOR }]} />

      {topQueries.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-neutral-500">熱門關鍵字(依點擊排序)</p>
          <BreakdownBars items={topQueries} />
        </div>
      )}
    </Card>
  );
}
