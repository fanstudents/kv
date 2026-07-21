"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";
import type { AgentStatus } from "@/lib/types";

interface ActivityRow {
  agent_slug: string | null;
  occurred_at: string;
  status: "success" | "failed" | "pending";
}

const STATUS_META: Record<AgentStatus, { label: string; color: string; live: boolean }> = {
  active: { label: "值勤中", color: "#06C755", live: true },
  paused: { label: "已暫停", color: "#F59E0B", live: false },
  draft: { label: "待命", color: "#8B8B8B", live: false },
};

const STATUS_RANK: Record<AgentStatus, number> = { active: 0, paused: 1, draft: 2 };

// 底部低調輪播的「現正處理」訊息（示意，呈現團隊持續運作的感覺）
const TICKER = [
  "客服 Amber 回覆了一則 LINE 進線訊息",
  "訂單 Ray 發送新訂單出貨通知",
  "數據 Ivy 產出今日成效摘要",
  "行程 Milo 發送明日會議提醒",
  "口碑 Jay 標記一則 Google 新評論",
  "通知 Kevin 觸發一則即時提醒",
  "營運 Morgan 更新知識庫條目",
  "總管 Vivian 彙整團隊晨報",
];

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function TvModePage() {
  const [now, setNow] = useState<Date | null>(null);
  const [todayTasks, setTodayTasks] = useState(168);
  const [tick, setTick] = useState(0);
  const [isFull, setIsFull] = useState(false);

  const ordered = useMemo(
    () => [...AGENTS].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]),
    []
  );
  const activeCount = useMemo(() => AGENTS.filter((a) => a.status === "active").length, []);
  const recipients = useMemo(() => AGENTS.reduce((sum, a) => sum + a.recipients, 0), []);

  // 時鐘：首幀以 rAF 帶入（避免在 effect 內同步 setState），之後每秒更新
  useEffect(() => {
    const kick = requestAnimationFrame(() => setNow(new Date()));
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(kick);
      clearInterval(t);
    };
  }, []);

  // 今日完成任務（近 24 小時成功數）；取不到就保留種子值
  useEffect(() => {
    const load = () =>
      fetch("/api/activity?status=success&limit=500")
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: ActivityRow[]) => {
          if (!Array.isArray(rows)) return;
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          const count = rows.filter((r) => new Date(r.occurred_at).getTime() >= cutoff).length;
          if (count > 0) setTodayTasks(count);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  // 訊息輪播
  useEffect(() => {
    const t = setInterval(() => setTick((i) => (i + 1) % TICKER.length), 4000);
    return () => clearInterval(t);
  }, []);

  // 全螢幕狀態
  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const dateLabel = now
    ? `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 週${WEEKDAYS[now.getDay()]}`
    : "";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      {/* 環境光暈：兩團緩慢漂移的漸層 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tv-blob-a absolute -left-[10%] -top-[15%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(6,199,85,0.22),transparent_65%)] blur-3xl" />
        <div className="tv-blob-b absolute -bottom-[20%] -right-[10%] h-[75vh] w-[75vh] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_65%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-8 py-8 sm:px-14 sm:py-10">
        {/* ── 頂列：時鐘 · 狀態 · 控制 ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="font-mono text-5xl font-extralight tabular-nums tracking-tight sm:text-7xl">
              {hh}
              <span className="text-white/40">:</span>
              {mm}
              <span className="ml-1 align-top text-2xl text-white/40 sm:text-3xl">{ss}</span>
            </p>
            <p className="mt-1 text-sm text-white/45">{dateLabel}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 backdrop-blur">
              <span className="tv-breathe h-2 w-2 rounded-full bg-[#06C755] shadow-[0_0_10px_2px_rgba(6,199,85,0.7)]" />
              {activeCount} 位 Agent 值勤中
            </span>
            <button
              type="button"
              onClick={toggleFull}
              title={isFull ? "退出全螢幕" : "全螢幕"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/60 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
            >
              {isFull ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <Link
              href="/dashboard"
              title="返回控制台"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/50 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={15} />
              控制台
            </Link>
          </div>
        </header>

        {/* ── 一個總覽 ── */}
        <section className="mt-10 grid grid-cols-3 gap-4 sm:mt-14 sm:gap-8">
          <Stat value={activeCount} suffix={`/ ${AGENTS.length}`} label="上工中隊友" />
          <Stat value={todayTasks} label="今日完成任務" accent />
          <Stat value={recipients} label="涵蓋 LINE 對象" />
        </section>

        {/* ── 運作中的 Agent 與狀態 ── */}
        <section className="mt-12 flex-1 sm:mt-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
            {ordered.map((agent, i) => {
              const meta = STATUS_META[agent.status];
              return (
                <div
                  key={agent.slug}
                  className="tv-in group relative flex flex-col items-center gap-3 rounded-3xl border p-6 text-center backdrop-blur-md transition-transform duration-500"
                  style={{
                    animationDelay: `${i * 60}ms`,
                    borderColor: meta.live ? "rgba(6,199,85,0.28)" : "rgba(255,255,255,0.08)",
                    background: meta.live
                      ? "linear-gradient(180deg,rgba(6,199,85,0.08),rgba(255,255,255,0.02))"
                      : "rgba(255,255,255,0.03)",
                    boxShadow: meta.live ? "0 0 45px -12px rgba(6,199,85,0.5)" : "none",
                    opacity: meta.live ? 1 : 0.62,
                  }}
                >
                  <div className="relative">
                    <Avatar personEn={agent.personEn} color={agent.color} size={64} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-[#05060a] ${
                        meta.live ? "tv-breathe" : ""
                      }`}
                      style={{
                        backgroundColor: meta.color,
                        boxShadow: meta.live ? `0 0 10px 2px ${meta.color}aa` : "none",
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-base font-medium leading-tight">
                      {agent.personEn}
                      <span className="ml-1 text-white/40">{agent.personZh}</span>
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: meta.live ? agent.color : "rgba(255,255,255,0.4)" }}>
                      {agent.role}
                    </p>
                  </div>
                  <span
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${meta.color}1f`,
                      color: meta.live ? meta.color : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 底部：現正處理輪播 ── */}
        <footer className="mt-10 flex items-center justify-center gap-3 text-sm text-white/40">
          <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
          <span className="text-white/35">現正處理</span>
          <span key={tick} className="tv-fade text-white/60">
            {TICKER[tick]}
          </span>
        </footer>
      </div>
    </main>
  );
}

function Stat({
  value,
  suffix,
  label,
  accent = false,
}: {
  value: number;
  suffix?: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <p className="flex items-baseline gap-2">
        <span
          className={`font-mono text-4xl font-extralight tabular-nums sm:text-7xl ${
            accent ? "text-[#06C755]" : "text-white"
          }`}
        >
          {value.toLocaleString("en-US")}
        </span>
        {suffix && <span className="text-lg font-light text-white/35 sm:text-2xl">{suffix}</span>}
      </p>
      <p className="mt-1 text-xs tracking-wide text-white/45 sm:text-sm">{label}</p>
    </div>
  );
}
