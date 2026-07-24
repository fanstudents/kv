"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import TrendChart from "@/components/agents/charts/TrendChart";
import type { PipelineOverview } from "@/lib/teaching-system";
import type { WeekOverview } from "@/lib/google";
import type { AgentSlug } from "@/lib/types";
import { buildTrafficDemo } from "@/lib/ga4-demo";
import { buildSearchDemo } from "@/lib/gsc-demo";
import { ADS_DEMO_CAMPAIGNS, ADS_DEMO_DAILY_SPEND, ADS_DEMO_STATS } from "@/lib/ads-demo";
import { SOCIAL_DEMO_POSTS, SOCIAL_DEMO_STATS, SOCIAL_DEMO_WEEKLY_ENGAGEMENT } from "@/lib/social-demo";
import {
  REPUTATION_DEMO_MENTIONS,
  REPUTATION_DEMO_STATS,
  REPUTATION_DEMO_TREND,
} from "@/lib/reputation-demo";

// 劇場模式的「彙報完才揭曉」區塊裡，五位行銷 Team 成員(數據／SEO／社群／廣告／口碑)
// 目前全數改用示範資料呈現(錄影／展示用途)——原本 report／expense 接的是真實 GA4／GSC，
// 想切回真實資料，把下面 ReportLiveMetrics／ExpenseLiveMetrics 改回呼叫
// /api/agents/report/traffic-overview、/api/agents/expense/seo-overview 即可(參照 git 歷史)。
// 營運／行程不是行銷 Team 成員，維持原本接真實資料來源的邏輯不變。

const LIVE_DATA_ENDPOINT: Partial<Record<AgentSlug, string>> = {
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

function ListRow({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-xs">
      <span className="min-w-0 truncate text-white/80">{primary}</span>
      <span className="shrink-0 text-white/35">{secondary}</span>
    </li>
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

// 數據參謀(Ivy)用:GA4 流量示範資料
function ReportLiveMetrics() {
  const data = buildTrafficDemo(7);
  const trendData = data.dailyTrend.map((d) => ({ date: d.date.slice(5).replace("-", "/"), sessions: d.sessions }));

  return (
    <PanelShell title="GA4 流量 · 近 7 天" source="Google Analytics 4（示範）">
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

// SEO 尖兵(Leo)用:GSC 關鍵字排名示範資料
function ExpenseLiveMetrics() {
  const data = buildSearchDemo(7);
  const trendData = data.dailyTrend.map((d) => ({ date: d.date.slice(5).replace("-", "/"), clicks: d.clicks }));

  return (
    <PanelShell title="SEO 成效 · 近 7 天" source="Google Search Console（示範）">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="總點擊次數" value={data.totalClicks.toLocaleString("en-US")} delta={data.clicksDelta} deltaHint="較前 7 天" />
        <StatBox label="總曝光次數" value={data.totalImpressions.toLocaleString("en-US")} />
        <StatBox label="平均排名" value={data.avgPosition.toFixed(1)} delta={data.positionDelta} deltaHint="正值＝名次進步" />
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
      <ul className="space-y-1.5">
        {data.topQueries.slice(0, 4).map((q) => (
          <ListRow key={q.query} primary={q.query} secondary={`第 ${q.position.toFixed(1)} 名 · ${q.clicks} 次點擊`} />
        ))}
      </ul>
    </PanelShell>
  );
}

// 社群操盤手(Sunny)用:多版位社群成效示範資料
function CardLiveMetrics() {
  const stats = SOCIAL_DEMO_STATS;

  return (
    <PanelShell title="社群經營 · 近 7 天" source="Instagram／Facebook／Threads（示範）">
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="本週發文" value={`${stats.posts}`} delta={stats.postsDelta} deltaHint="較前 7 天" />
        <StatBox label="平均互動率" value={`${stats.avgEngagement}%`} delta={stats.avgEngagementDelta} deltaHint="較前 7 天" />
        <StatBox label="總觸及" value={stats.totalReach.toLocaleString("en-US")} />
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <TrendChart
          data={SOCIAL_DEMO_WEEKLY_ENGAGEMENT}
          xKey="date"
          series={[{ key: "engagement", name: "互動率", color: "#8B5CF6" }]}
          height={140}
          valueFormatter={(v) => `${v}%`}
          forceDark
        />
      </div>
      <ul className="space-y-1.5">
        {SOCIAL_DEMO_POSTS.slice(0, 3).map((p) => (
          <ListRow key={`${p.platform}-${p.format}`} primary={`${p.platform} · ${p.format}`} secondary={p.scheduledAt} />
        ))}
      </ul>
    </PanelShell>
  );
}

// 廣告投手(Dana)用:Meta 廣告成效示範資料
function TodayLiveMetrics() {
  return (
    <PanelShell title="Meta 廣告成效 · 近 7 天" source="Meta 廣告管理員（示範）">
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="廣告花費"
          value={`NT$ ${ADS_DEMO_STATS.spend.toLocaleString("en-US")}`}
          delta={ADS_DEMO_STATS.spendDelta}
          deltaHint="較前 7 天"
        />
        <StatBox label="整體 ROAS" value={ADS_DEMO_STATS.roas.toFixed(1)} delta={ADS_DEMO_STATS.roasDelta} deltaHint="較前 7 天" />
        <StatBox
          label="平均 CPA"
          value={`NT$ ${ADS_DEMO_STATS.cpa}`}
          delta={-ADS_DEMO_STATS.cpaDelta}
          deltaHint="正值＝成本下降"
        />
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <TrendChart
          data={ADS_DEMO_DAILY_SPEND}
          xKey="date"
          series={[{ key: "spend", name: "花費", color: "#EF4444" }]}
          height={140}
          valueFormatter={(v) => `NT$ ${v.toLocaleString("en-US")}`}
          forceDark
        />
      </div>
      <ul className="space-y-1.5">
        {ADS_DEMO_CAMPAIGNS.slice(0, 3).map((c) => (
          <ListRow key={c.name} primary={c.name} secondary={`ROAS ${c.roas.toFixed(1)} · ${c.status}`} />
        ))}
      </ul>
    </PanelShell>
  );
}

// 輿情哨兵(Jay)用:多平台情緒分數 + 聲量內容示範資料
function CompetitorLiveMetrics() {
  return (
    <PanelShell title="品牌口碑與聲量 · 近 7 天" source="多平台社群聆聽（示範）">
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="總聲量"
          value={REPUTATION_DEMO_STATS.totalMentions.toLocaleString("en-US")}
          delta={REPUTATION_DEMO_STATS.mentionsDelta}
          deltaHint="較前 7 天"
        />
        <StatBox label="正面評價比例" value={`${REPUTATION_DEMO_STATS.positiveRatio}%`} delta={REPUTATION_DEMO_STATS.positiveRatioDelta} deltaHint="較前 7 天" />
        <StatBox label="待處理負評" value={`${REPUTATION_DEMO_STATS.pendingNegative}`} />
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <TrendChart
          data={REPUTATION_DEMO_TREND}
          xKey="date"
          series={[
            { key: "positive", name: "正面", color: "#06C755" },
            { key: "negative", name: "負面", color: "#EF4444" },
          ]}
          height={140}
          forceDark
        />
      </div>
      <ul className="space-y-2">
        {REPUTATION_DEMO_MENTIONS.map((m, i) => (
          <li
            key={i}
            className={`rounded-xl border px-3.5 py-2.5 text-xs ${
              m.sentiment === "negative" ? "border-amber-400/25 bg-amber-400/[0.06]" : "border-white/8 bg-white/[0.03]"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium text-white/70">{m.platform}</span>
              <span className="text-white/35">{m.handle}</span>
              <span
                className={`ml-auto shrink-0 ${
                  m.sentiment === "positive" ? "text-[#06C755]" : m.sentiment === "negative" ? "text-amber-300" : "text-white/40"
                }`}
              >
                {m.time}
              </span>
            </div>
            <p className="leading-relaxed text-white/70">「{m.quote}」</p>
          </li>
        ))}
      </ul>
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
  if (slug === "card") return <CardLiveMetrics />;
  if (slug === "today") return <TodayLiveMetrics />;
  if (slug === "competitor") return <CompetitorLiveMetrics />;
  if (slug === "operations") return <OperationsLiveMetrics color={color} />;
  if (slug === "schedule") return <ScheduleLiveMetrics />;
  return null;
}
