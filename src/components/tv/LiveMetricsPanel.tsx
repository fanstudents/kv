"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import TrendChart from "@/components/agents/charts/TrendChart";
import type { SearchOverview } from "@/lib/gsc";
import type { TrafficOverview } from "@/lib/ga4";
import type { PipelineOverview } from "@/lib/teaching-system";
import type { WeekOverview } from "@/lib/google";
import type { AgentSlug } from "@/lib/types";

// 劇場模式的「彙報完才揭曉」區塊裡，接了真實數據來源的 Agent 除了原本的示意 weekStats，
// 再多秀一段真的內容——但形狀跟著資料本質走，不是每個都套同一個「數字卡+趨勢圖」模板：
// GA4／GSC 是流量指標，用趨勢圖；行程是行事曆，用七天分佈條＋接下來的行程；營運是專案，
// 除了趨勢圖還多一份本月清單。預設都是跟前 7 天比較增長幅度(營運是專案而非日流量指標,
// 維持看近 6 個月趨勢；行程是「未來」而非「過去」的行程分佈，也不適用增幅比較)。
// 沒接真實數據源的 Agent 這裡直接不渲染任何東西，外層不用另外判斷。

const LIVE_DATA_ENDPOINT: Partial<Record<AgentSlug, string>> = {
  report: "/api/agents/report/traffic-overview",
  expense: "/api/agents/expense/seo-overview",
  operations: "/api/agents/operations/pipeline",
  schedule: "/api/agents/schedule/week-overview",
};

function useOverview<T>(slug: AgentSlug) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const endpoint = LIVE_DATA_ENDPOINT[slug];
    if (!endpoint) return;
    let alive = true;
    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok) setData(d.data as T);
        else setError(d.error ?? "讀取失敗");
      })
      .catch(() => alive && setError("讀取失敗"));
    return () => {
      alive = false;
    };
  }, [slug]);

  return { data, error };
}

function StatBox({ label, value, delta, deltaHint }: { label: string; value: string; delta?: number | null; deltaHint?: string }) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const isUp = hasDelta && (delta as number) > 0;
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-center" title={deltaHint}>
      <p className="font-mono text-xl font-light text-white">
        {value}
        {hasDelta && (
          <span className={`ml-1 text-xs ${isUp ? "text-[#06C755]" : "text-red-400"}`}>
            {isUp ? "▲" : "▼"}
            {Math.abs(delta as number).toLocaleString("en-US")}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-white/40">{label}</p>
    </div>
  );
}

function PanelShell({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  return (
    <div className="tv-in space-y-3">
      <p className="flex items-center justify-between text-[11px] font-semibold tracking-[0.2em] text-white/40">
        <span className="flex items-center gap-2">
          <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
          {title}
        </span>
        <span className="font-normal tracking-normal text-white/25">{source}</span>
      </p>
      {children}
    </div>
  );
}

function ReportLiveMetrics() {
  const { data, error } = useOverview<TrafficOverview>("report");
  if (error) return <p className="text-xs text-white/30">GA4 真實資料讀取失敗：{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />;

  const trendData = data.dailyTrend.map((d) => ({ date: d.date.slice(5).replace("-", "/"), sessions: d.sessions }));

  return (
    <PanelShell title="GA4 真實流量 · 近 7 天" source="Google Analytics 4">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="工作階段" value={data.sessions.toLocaleString("en-US")} delta={data.sessionsDelta} deltaHint="較前 7 天" />
        <StatBox label="不重複使用者" value={data.activeUsers.toLocaleString("en-US")} />
        <StatBox label="轉換數" value={data.conversions.toLocaleString("en-US")} />
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <TrendChart
          data={trendData}
          xKey="date"
          series={[{ key: "sessions", name: "工作階段", color: "#3B82F6" }]}
          height={140}
          forceDark
        />
      </div>
    </PanelShell>
  );
}

function ExpenseLiveMetrics() {
  const { data, error } = useOverview<SearchOverview>("expense");
  if (error) return <p className="text-xs text-white/30">Search Console 真實資料讀取失敗：{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />;

  const trendData = data.dailyTrend.map((d) => ({ date: d.date.slice(5).replace("-", "/"), clicks: d.clicks }));

  return (
    <PanelShell title="SEO 真實成效 · 近 7 天" source="Google Search Console">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="總點擊次數" value={data.totalClicks.toLocaleString("en-US")} delta={data.clicksDelta} deltaHint="較前 7 天" />
        <StatBox label="總曝光次數" value={data.totalImpressions.toLocaleString("en-US")} />
        <StatBox
          label="平均排名"
          value={data.avgPosition.toFixed(1)}
          delta={data.positionDelta}
          deltaHint="正值＝名次進步"
        />
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <TrendChart
          data={trendData}
          xKey="date"
          series={[{ key: "clicks", name: "點擊", color: "#14B8A6" }]}
          height={140}
          forceDark
        />
      </div>
    </PanelShell>
  );
}

function OperationsLiveMetrics({ color }: { color: string }) {
  const { data, error } = useOverview<PipelineOverview>("operations");
  if (error) return <p className="text-xs text-white/30">教學系統真實資料讀取失敗：{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />;

  const trendData = data.monthlyTrend.map((m) => ({
    label: m.label,
    enterpriseTraining: m.enterpriseTraining,
    publicCourse: m.publicCourse,
  }));

  return (
    <PanelShell title="營運真實現況 · 近 6 個月" source="教學系統資料庫">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="企業內訓" value={`${data.enterpriseTrainingCount}`} />
        <StatBox label="公開課程" value={`${data.publicCourseCount}`} />
        <StatBox label="本月新增" value={`${data.thisMonthProjects.length}`} />
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <TrendChart
          data={trendData}
          xKey="label"
          series={[
            { key: "enterpriseTraining", name: "企業內訓", color },
            { key: "publicCourse", name: "公開課程", color: "#94A3B8" },
          ]}
          height={140}
          forceDark
        />
      </div>
      {data.thisMonthProjects.length > 0 && (
        <ul className="space-y-1.5">
          {data.thisMonthProjects.slice(0, 4).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-xs"
            >
              <span className="min-w-0 truncate text-white/80">
                {p.name}
                <span className="ml-1.5 text-white/35">{p.typeLabel}</span>
              </span>
              <span className={`shrink-0 ${p.closed ? "text-[#06C755]" : "text-white/35"}`}>
                {p.closed ? `已成案 ×${p.sessionCount}` : "未成案"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

// 行程助理(Milo)用:跟數字趨勢圖不同,這裡是行事曆形狀——未來七天的行程分佈條、
// 接下來的行程、衝突提醒，不套「7 天增幅」的比較(未來的行程本來就沒有「前 7 天」可比)。
function ScheduleLiveMetrics() {
  const { data, error } = useOverview<WeekOverview>("schedule");
  if (error) return <p className="text-xs text-white/30">Google 行事曆真實資料讀取失敗：{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />;

  const maxCount = Math.max(1, ...data.dayCounts);
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <PanelShell title="本週行事曆 · 未來 7 天" source="Google 行事曆">
      <div className="grid grid-cols-7 gap-2">
        {data.dayCounts.map((count, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] py-2.5"
            >
              <p className="text-[10px] text-white/35">{i === 0 ? "今天" : `週${weekdays[d.getDay()]}`}</p>
              <p className="font-mono text-lg font-light" style={{ color: count > 0 ? "#8B5CF6" : "rgba(255,255,255,0.3)" }}>
                {count}
              </p>
              <div className="h-1 w-5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#8B5CF6]"
                  style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {data.warnings.length > 0 && (
        <div className="space-y-1.5">
          {data.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-300">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      {data.upcoming.length > 0 && (
        <ul className="space-y-1.5">
          {data.upcoming.map((u, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-xs"
            >
              <span className="min-w-0 truncate text-white/80">{u.title}</span>
              <span className="shrink-0 text-white/35">{u.label}</span>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

export default function LiveMetricsPanel({ slug, color }: { slug: AgentSlug; color: string }) {
  if (slug === "report") return <ReportLiveMetrics />;
  if (slug === "expense") return <ExpenseLiveMetrics />;
  if (slug === "operations") return <OperationsLiveMetrics color={color} />;
  if (slug === "schedule") return <ScheduleLiveMetrics />;
  return null;
}
