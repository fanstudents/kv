"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
} from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

interface ActivityRow {
  agent_slug: string | null;
  occurred_at: string;
  status: "success" | "failed" | "pending";
}

// 每位 Agent 目前正在做的事（聚光場景用，示意）
const DOING: Record<AgentSlug, string> = {
  teamlead: "彙整過去 24 小時團隊摘要",
  notify: "監控指標，待命觸發即時提醒",
  report: "產出今日成效報表與洞察",
  schedule: "整理明日行程並發送提醒",
  card: "排程今日社群貼文",
  expense: "分析關鍵字排名變化",
  visit: "安排本週拜訪時段",
  today: "抓取各渠道廣告成效",
  competitor: "追蹤競品最新動態",
  operations: "更新知識庫常見問答",
  support: "待命，準備接手進線訊息",
  orders: "待命，監看新訂單 Webhook",
};

const SCENES = ["此刻", "戰情總覽", "值勤團隊", "現正聚光"] as const;
const N = SCENES.length;
const AUTOPLAY_MS = 12_000;
const SPOTLIGHT_MS = 5_000;
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// 時鐘 hook：只驅動自己所在的葉節點更新，不牽動整個頁面（避免場景動畫被重播）
function useClock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    const kick = requestAnimationFrame(() => setT(new Date()));
    const id = setInterval(() => setT(new Date()), 1000);
    return () => {
      cancelAnimationFrame(kick);
      clearInterval(id);
    };
  }, []);
  return t;
}

function clockParts(t: Date | null) {
  return {
    hh: t ? String(t.getHours()).padStart(2, "0") : "--",
    mm: t ? String(t.getMinutes()).padStart(2, "0") : "--",
    dateLabel: t ? `${t.getMonth() + 1} 月 ${t.getDate()} 日 · 週${WEEKDAYS[t.getDay()]}` : "",
  };
}

export default function TvModePage() {
  const [scene, setScene] = useState(0);
  const [dir, setDir] = useState(1);
  const [autoplay, setAutoplay] = useState(true);
  const [spot, setSpot] = useState(0);
  const [isFull, setIsFull] = useState(false);

  const activeAgents = useMemo(() => AGENTS.filter((a) => a.status === "active"), []);
  const activeCount = activeAgents.length;
  const recipients = useMemo(() => AGENTS.reduce((sum, a) => sum + a.recipients, 0), []);

  // 自動輪播場景（可暫停）；手動切換也會重置計時
  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => {
      setDir(1);
      setScene((i) => (i + 1) % N);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [autoplay, scene]);

  // 聚光場景：每 5 秒輪流放大一位值勤 Agent
  useEffect(() => {
    if (activeCount === 0) return;
    const t = setInterval(() => setSpot((s) => (s + 1) % activeCount), SPOTLIGHT_MS);
    return () => clearInterval(t);
  }, [activeCount]);

  // 全螢幕狀態
  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // 鍵盤操作：← → 切換場景、空白鍵切換自動輪播
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setDir(1);
        setScene((i) => (i + 1) % N);
      } else if (e.key === "ArrowLeft") {
        setDir(-1);
        setScene((i) => (i - 1 + N) % N);
      } else if (e.key === " ") {
        e.preventDefault();
        setAutoplay((a) => !a);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (delta: number) => {
    setDir(delta > 0 ? 1 : -1);
    setScene((i) => (i + delta + N) % N);
  };
  const jump = (i: number) => {
    setDir(i > scene ? 1 : -1);
    setScene(i);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const slideClass = dir > 0 ? "tv-slide-r" : "tv-slide-l";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      {/* 環境光暈 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tv-blob-a absolute -left-[10%] -top-[15%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(6,199,85,0.2),transparent_65%)] blur-3xl" />
        <div className="tv-blob-b absolute -bottom-[20%] -right-[10%] h-[75vh] w-[75vh] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15),transparent_65%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.6))]" />
      </div>

      {/* 常駐迷你時鐘（非「此刻」場景時顯示） */}
      {scene !== 0 && <MiniClock />}

      {/* 右上控制列 */}
      <div className="absolute right-6 top-6 z-20 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setAutoplay((a) => !a)}
          title={autoplay ? "暫停輪播" : "自動輪播"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          {autoplay ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          type="button"
          onClick={toggleFull}
          title={isFull ? "退出全螢幕" : "全螢幕"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          {isFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
        <Link
          href="/dashboard"
          title="返回控制台"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={15} />
          控制台
        </Link>
      </div>

      {/* 場景舞台（一次只專注一件事） */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-28">
        <div key={scene} className={`${slideClass} w-full max-w-[1320px]`}>
          {scene === 0 && <SceneNow activeCount={activeCount} />}
          {scene === 1 && (
            <SceneOverview activeCount={activeCount} total={AGENTS.length} recipients={recipients} />
          )}
          {scene === 2 && <SceneTeam agents={activeAgents} />}
          {scene === 3 && activeCount > 0 && (
            <SceneSpotlight
              agent={activeAgents[spot % activeCount]}
              index={spot % activeCount}
              total={activeCount}
            />
          )}
        </div>
      </div>

      {/* 底部頻道切換 */}
      <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5">
        <button
          type="button"
          onClick={() => go(-1)}
          title="上一個場景"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={17} />
        </button>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium tracking-[0.25em] text-white/50">{SCENES[scene]}</span>
          <div className="flex items-center gap-2">
            {SCENES.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => jump(i)}
                title={s}
                aria-label={s}
                className={`h-1.5 rounded-full transition-all ${
                  i === scene ? "w-6 bg-[#06C755]" : "w-1.5 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          title="下一個場景"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </main>
  );
}

/* ── 迷你時鐘（自我更新的葉節點） ── */
function MiniClock() {
  const { hh, mm } = clockParts(useClock());
  return (
    <p className="absolute left-8 top-7 z-20 font-mono text-sm tabular-nums text-white/35">
      {hh}:{mm}
    </p>
  );
}

/* ── 場景一：此刻（大時鐘，自我更新） ── */
const SceneNow = memo(function SceneNow({ activeCount }: { activeCount: number }) {
  const { hh, mm, dateLabel } = clockParts(useClock());
  return (
    <div className="text-center">
      <p className="font-mono text-[clamp(4.5rem,17vw,12rem)] font-thin leading-none tabular-nums tracking-tight">
        {hh}
        <span className="tv-breathe text-white/30">:</span>
        {mm}
      </p>
      <p className="mt-8 text-lg text-white/50 sm:text-2xl">{dateLabel}</p>
      <div className="mt-10 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-base text-white/85 backdrop-blur">
        <span className="tv-breathe h-2.5 w-2.5 rounded-full bg-[#06C755] shadow-[0_0_12px_2px_rgba(6,199,85,0.7)]" />
        {activeCount} 位 Agent 正在值勤
      </div>
    </div>
  );
});

/* ── 場景二：戰情總覽（三個大數字） ── */
const SceneOverview = memo(function SceneOverview({
  activeCount,
  total,
  recipients,
}: {
  activeCount: number;
  total: number;
  recipients: number;
}) {
  const [todayTasks, setTodayTasks] = useState(168);

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

  return (
    <div className="text-center">
      <p className="mb-16 text-xs tracking-[0.35em] text-white/40">團 隊 戰 情</p>
      <div className="flex flex-col items-center justify-center gap-14 sm:flex-row sm:gap-24">
        <BigStat value={activeCount} suffix={`/ ${total}`} label="上工中隊友" />
        <BigStat value={todayTasks} label="今日完成任務" accent />
        <BigStat value={recipients} label="涵蓋 LINE 對象" />
      </div>
    </div>
  );
});

function BigStat({
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
    <div className="flex flex-col items-center">
      <p className="flex items-baseline gap-2">
        <span
          className={`font-mono text-6xl font-thin tabular-nums sm:text-8xl ${
            accent ? "text-[#06C755]" : "text-white"
          }`}
        >
          {value.toLocaleString("en-US")}
        </span>
        {suffix && <span className="text-xl font-light text-white/35 sm:text-3xl">{suffix}</span>}
      </p>
      <p className="mt-3 text-sm tracking-wide text-white/45 sm:text-base">{label}</p>
    </div>
  );
}

/* ── 場景三：值勤團隊（寬鬆的頭像牆） ── */
const SceneTeam = memo(function SceneTeam({ agents }: { agents: typeof AGENTS }) {
  return (
    <div>
      <p className="mb-12 text-center text-xs tracking-[0.35em] text-white/40">
        值 勤 中 的 隊 友 · {agents.length}
      </p>
      <div className="mx-auto grid max-w-[1160px] grid-cols-3 gap-x-6 gap-y-12 sm:grid-cols-5">
        {agents.map((agent, i) => (
          <div
            key={agent.slug}
            className="tv-in flex flex-col items-center gap-3 text-center"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="relative">
              <Avatar personEn={agent.personEn} color={agent.color} size={78} />
              <span
                className="tv-breathe absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-[#05060a] bg-[#06C755]"
                style={{ boxShadow: "0 0 10px 2px rgba(6,199,85,0.6)" }}
              />
            </div>
            <div>
              <p className="text-base font-medium leading-tight">{agent.personEn}</p>
              <p className="mt-0.5 text-xs text-white/40">{agent.shortName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ── 場景四:現正聚光（單一 Agent 放大） ── */
const SceneSpotlight = memo(function SceneSpotlight({
  agent,
  index,
  total,
}: {
  agent: (typeof AGENTS)[number];
  index: number;
  total: number;
}) {
  return (
    <div key={agent.slug} className="tv-pop flex flex-col items-center text-center">
      <div className="relative">
        <span
          className="absolute -inset-4 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${agent.color}55, transparent 70%)` }}
        />
        <div className="relative">
          <Avatar personEn={agent.personEn} color={agent.color} size={168} />
          <span
            className="tv-breathe absolute bottom-2 right-2 h-6 w-6 rounded-full border-4 border-[#05060a] bg-[#06C755]"
            style={{ boxShadow: "0 0 14px 3px rgba(6,199,85,0.7)" }}
          />
        </div>
      </div>

      <p className="mt-9 text-4xl font-light sm:text-5xl">
        {agent.personEn}
        <span className="ml-2 text-white/40">{agent.personZh}</span>
      </p>
      <p className="mt-2 text-lg" style={{ color: agent.color }}>
        {agent.role} · {agent.name}
      </p>

      <p className="mt-9 max-w-xl text-lg text-white/55 sm:text-xl">
        <span className="text-white/35">正在　</span>
        {DOING[agent.slug]}
      </p>

      <p className="mt-6 font-mono text-xs tracking-widest text-white/30">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
    </div>
  );
});
