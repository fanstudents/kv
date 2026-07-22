"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  FileText,
  Mail,
  Maximize2,
  Megaphone,
  MessageSquare,
  Minimize2,
  Pause,
  Play,
  Video,
  Orbit,
  X,
} from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import LiveTask, { type LiveInfo } from "@/components/tv/LiveTask";
import RotatingPortrait from "@/components/tv/RotatingPortrait";
import { AGENTS, avatarFrames } from "@/lib/agent-data";
import { AGENT_BRIEFINGS, AGENT_LIVE_TASKS, type OutputKind } from "@/lib/agent-briefings";
import type { AgentSlug } from "@/lib/types";

type Agent = (typeof AGENTS)[number];

const OUTPUT_ICON: Record<OutputKind, React.ReactNode> = {
  report: <FileBarChart size={15} />,
  chart: <BarChart3 size={15} />,
  doc: <FileText size={15} />,
  mail: <Mail size={15} />,
  calendar: <Calendar size={15} />,
  post: <Megaphone size={15} />,
  message: <MessageSquare size={15} />,
  alert: <Bell size={15} />,
};

// 打字機：像真人一邊講一邊出字；點一下可略過。以「經過時間」推進，
// 讓總時長固定（不受計時器被節流影響）。
function useTypewriter(text: string, msPerChar = 22) {
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const kick = requestAnimationFrame(() => setLen(text.length));
      return () => cancelAnimationFrame(kick);
    }
    const start = performance.now();
    const id = setInterval(() => {
      const n = Math.floor((performance.now() - start) / msPerChar);
      if (n >= text.length) {
        setLen(text.length);
        clearInterval(id);
      } else {
        setLen(n);
      }
    }, 16);
    return () => clearInterval(id);
  }, [text, msPerChar]);
  return { shown: text.slice(0, len), done: len >= text.length, skip: () => setLen(text.length) };
}

interface ActivityRow {
  agent_slug: string | null;
  occurred_at: string;
  status: "success" | "failed" | "pending";
  summary?: string | null;
}

/** 真實動態流：底部 LIVE 跑馬燈與「今日快報」場景共用，每 60 秒更新一次 */
function useActivityFeed(limit = 30): ActivityRow[] {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/activity?limit=${limit}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          if (alive && Array.isArray(d)) setRows(d as ActivityRow[]);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [limit]);
  return rows;
}

/** 數字滾動：場景亮相時從 0 衝到目標值（Netflix 數據大屏的儀式感） */
function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const kick = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(kick);
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
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

const SCENES = ["此刻", "戰情總覽", "值勤團隊", "現正聚光", "今日快報"] as const;
const N = SCENES.length;
const AUTOPLAY_MS = 12_000;
const SPOTLIGHT_MS = 6_000;
const POSTER_FOCUS_MS = 3_200;
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
  const [autoplay, setAutoplay] = useState(true);
  const [spot, setSpot] = useState(0);
  const [isFull, setIsFull] = useState(false);
  const [openAgent, setOpenAgent] = useState<AgentSlug | null>(null);
  const [introDone, setIntroDone] = useState(false);

  const activeAgents = useMemo(() => AGENTS.filter((a) => a.status === "active"), []);
  const activeCount = activeAgents.length;
  const recipients = useMemo(() => AGENTS.reduce((sum, a) => sum + a.recipients, 0), []);
  const feed = useActivityFeed(30);

  const openDetail = useCallback((slug: AgentSlug) => setOpenAgent(slug), []);
  const closeDetail = useCallback(() => setOpenAgent(null), []);

  // 片頭播完才開始自動輪播（可暫停；展開細節時也暫停）
  useEffect(() => {
    if (!introDone || !autoplay || openAgent) return;
    const t = setInterval(() => {
      setScene((i) => (i + 1) % N);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [introDone, autoplay, scene, openAgent]);

  // 片頭自動收場（點擊也可提前略過）
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 3400);
    return () => clearTimeout(t);
  }, []);

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

  // 鍵盤操作：展開細節時 Esc 關閉；否則 ← → 切換場景、空白鍵切換自動輪播
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (openAgent) {
        if (e.key === "Escape") setOpenAgent(null);
        return;
      }
      if (e.key === "ArrowRight") {
        setScene((i) => (i + 1) % N);
      } else if (e.key === "ArrowLeft") {
        setScene((i) => (i - 1 + N) % N);
      } else if (e.key === " ") {
        e.preventDefault();
        setAutoplay((a) => !a);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAgent]);

  const go = (delta: number) => setScene((i) => (i + delta + N) % N);
  const jump = (i: number) => setScene(i);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      {/* 環境光暈 + 電影質感（顆粒與暗角） */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tv-blob-a absolute -left-[10%] -top-[15%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(6,199,85,0.2),transparent_65%)] blur-3xl" />
        <div className="tv-blob-b absolute -bottom-[20%] -right-[10%] h-[75vh] w-[75vh] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.15),transparent_65%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.6))]" />
        <FilmGrain />
      </div>

      {/* 片頭（進場一次，點擊可略過） */}
      {!introDone && <CinematicIntro onSkip={() => setIntroDone(true)} activeCount={activeCount} />}

      {/* 常駐迷你時鐘（非「此刻」場景時顯示） */}
      {scene !== 0 && <MiniClock />}

      {/* 右上控制列 */}
      <div className="absolute right-6 top-6 z-20 flex items-center gap-2.5">
        <Link
          href="/meeting"
          title="開一場視訊會議"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_20px_-4px_rgba(6,199,85,0.7)] transition-transform hover:scale-105"
        >
          <Video size={15} />
          開會
        </Link>
        <Link
          href="/universe"
          title="節點宇宙：看所有 Agent 與服務串接的連通關係"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-sm font-semibold text-indigo-200 backdrop-blur transition-transform hover:scale-105"
        >
          <Orbit size={15} />
          宇宙
        </Link>
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

      {/* 場景舞台（一次只專注一件事；電影級縮放淡入轉場） */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pb-32 pt-24">
        <div key={scene} className="tv-scene-in w-full max-w-[1320px]">
          {scene === 0 && <SceneNow activeCount={activeCount} />}
          {scene === 1 && (
            <SceneOverview
              activeCount={activeCount}
              total={AGENTS.length}
              recipients={recipients}
              visible={introDone}
            />
          )}
          {scene === 2 && <SceneTeam agents={activeAgents} onOpen={openDetail} />}
          {scene === 3 && activeCount > 0 && (
            <SceneSpotlight
              agent={activeAgents[spot % activeCount]}
              index={spot % activeCount}
              total={activeCount}
              onOpen={openDetail}
            />
          )}
          {scene === 4 && <SceneHighlights feed={feed} onOpen={openDetail} />}
        </div>
      </div>

      {/* 底部 LIVE 跑馬燈：真實動態不停歇（新聞台 chyron 質感） */}
      <Chyron feed={feed} />

      {/* 點擊 Agent → 劇院式細節（正在做什麼、做過什麼） */}
      {openAgent && (
        <AgentDetail agent={AGENTS.find((a) => a.slug === openAgent) as Agent} onClose={closeDetail} />
      )}

      {/* 底部頻道切換（活躍場景上有自動輪播倒數進度條） */}
      <div className="absolute bottom-14 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5">
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
                className={`relative h-1.5 overflow-hidden rounded-full transition-all ${
                  i === scene ? "w-9 bg-white/20" : "w-1.5 bg-white/25 hover:bg-white/50"
                }`}
              >
                {i === scene && (
                  <span
                    key={`${scene}-${autoplay}-${introDone}`}
                    className={`absolute inset-0 rounded-full bg-[#06C755] ${
                      autoplay && introDone && !openAgent ? "tv-progress" : ""
                    }`}
                    style={{ ["--progress-duration" as string]: `${AUTOPLAY_MS}ms` }}
                  />
                )}
              </button>
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

/* ── 電影顆粒（SVG 雜訊，內嵌 data URI，無外部資源） ── */
function FilmGrain() {
  return (
    <div
      className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.7'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

/* ── 片頭：黑幕 → 標題字距收攏亮起 → 光帶掃過 → 淡出（點擊可略過） ── */
function CinematicIntro({ onSkip, activeCount }: { onSkip: () => void; activeCount: number }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label="略過片頭"
      className="tv-intro-out fixed inset-0 z-50 flex cursor-default flex-col items-center justify-center bg-[#030407]"
    >
      <div className="relative overflow-hidden px-6 py-2">
        <h1 className="tv-title-in text-[clamp(2rem,6vw,4.5rem)] font-extralight text-white">
          原騰數位科技 AI 團隊
        </h1>
        {/* 光帶掃過 */}
        <span className="tv-sheen pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>
      <p className="tv-fade mt-6 text-sm tracking-[0.5em] text-white/40" style={{ animationDelay: "1.4s" }}>
        {activeCount} 位 AI 同事 · 全天候值勤
      </p>
      <span
        className="tv-fade absolute bottom-10 text-[11px] tracking-widest text-white/25"
        style={{ animationDelay: "2s" }}
      >
        點擊任意處進入
      </span>
    </button>
  );
}

/* ── 底部 LIVE 跑馬燈：真實團隊動態無縫循環（新聞台 chyron） ── */
function Chyron({ feed }: { feed: ActivityRow[] }) {
  const items = useMemo(() => {
    const nameOf = (slug: string | null) => {
      const a = AGENTS.find((x) => x.slug === slug);
      return a ? a.personEn : "系統";
    };
    const rows = feed.slice(0, 14).map((r) => {
      const t = new Date(r.occurred_at);
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      const mark = r.status === "failed" ? "⚠" : r.status === "pending" ? "…" : "✓";
      return `${hh}:${mm}｜${nameOf(r.agent_slug)}｜${(r.summary ?? "").slice(0, 42)} ${mark}`;
    });
    return rows.length > 0
      ? rows
      : AGENTS.filter((a) => a.status === "active").map((a) => `${a.personEn}｜${AGENT_LIVE_TASKS[a.slug].idle}`);
  }, [feed]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-9 items-center border-t border-white/8 bg-black/45 backdrop-blur">
      <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-white/8 bg-black/40 px-4 text-[11px] font-bold tracking-widest text-red-400">
        <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-red-500" />
        LIVE
      </span>
      <div className="relative h-full flex-1 overflow-hidden">
        <div
          className="tv-marquee absolute flex h-full w-max items-center"
          style={{ ["--marquee-duration" as string]: `${Math.max(30, items.length * 7)}s` }}
        >
          {[0, 1].map((copy) => (
            <span key={copy} className="flex h-full items-center">
              {items.map((it, i) => (
                <span key={`${copy}-${i}`} className="flex items-center whitespace-nowrap px-6 text-xs text-white/55">
                  {it}
                  <span className="ml-12 text-white/15">•</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
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

/* ── 場景二：戰情總覽（數字滾動 + 過去 12 小時的真實脈搏） ── */
const SceneOverview = memo(function SceneOverview({
  activeCount,
  total,
  recipients,
  visible,
}: {
  activeCount: number;
  total: number;
  recipients: number;
  visible: boolean;
}) {
  const [todayTasks, setTodayTasks] = useState(168);
  const [pulse, setPulse] = useState<number[]>([]); // 過去 12 小時每小時成功數（真實）

  // 今日完成任務（近 24 小時成功數）；取不到就保留種子值
  useEffect(() => {
    const load = () =>
      fetch("/api/activity?status=success&limit=500")
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: ActivityRow[]) => {
          if (!Array.isArray(rows)) return;
          const now = Date.now();
          const cutoff = now - 24 * 60 * 60 * 1000;
          const count = rows.filter((r) => new Date(r.occurred_at).getTime() >= cutoff).length;
          if (count > 0) setTodayTasks(count);
          // 依小時分桶：index 0 = 11 小時前，index 11 = 這一小時
          const buckets = Array.from({ length: 12 }, () => 0);
          rows.forEach((r) => {
            const age = now - new Date(r.occurred_at).getTime();
            const h = Math.floor(age / 3_600_000);
            if (h >= 0 && h < 12) buckets[11 - h] += 1;
          });
          setPulse(buckets);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const maxPulse = Math.max(1, ...pulse);

  return (
    <div className="text-center">
      <p className="mb-14 text-xs tracking-[0.35em] text-white/40">團 隊 戰 情</p>
      <div className="flex flex-col items-center justify-center gap-14 sm:flex-row sm:gap-24">
        <BigStat value={visible ? activeCount : 0} suffix={`/ ${total}`} label="上工中隊友" />
        <BigStat value={visible ? todayTasks : 0} label="今日完成任務" accent />
        <BigStat value={visible ? recipients : 0} label="涵蓋 LINE 對象" />
      </div>

      {/* 團隊脈搏：過去 12 小時每小時完成數（真實資料） */}
      {pulse.some((v) => v > 0) && (
        <div className="mx-auto mt-16 max-w-md">
          <div className="flex h-14 items-end justify-center gap-2">
            {pulse.map((v, i) => (
              <div
                key={i}
                className="w-4 rounded-t-sm transition-all duration-700"
                style={{
                  height: `${Math.max(8, (v / maxPulse) * 100)}%`,
                  background:
                    i === pulse.length - 1
                      ? "#06C755"
                      : `rgba(6,199,85,${0.15 + (v / maxPulse) * 0.4})`,
                  boxShadow: i === pulse.length - 1 ? "0 0 14px -2px rgba(6,199,85,0.8)" : "none",
                }}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] tracking-[0.2em] text-white/35">團隊脈搏 · 過去 12 小時</p>
        </div>
      )}
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
  const shown = useCountUp(value);
  return (
    <div className="flex flex-col items-center">
      <p className="flex items-baseline gap-2">
        <span
          className={`font-mono text-6xl font-thin tabular-nums sm:text-8xl ${
            accent ? "text-[#06C755]" : "text-white"
          }`}
        >
          {shown.toLocaleString("en-US")}
        </span>
        {suffix && <span className="text-xl font-light text-white/35 sm:text-3xl">{suffix}</span>}
      </p>
      <p className="mt-3 text-sm tracking-wide text-white/45 sm:text-base">{label}</p>
    </div>
  );
}

/* ── 場景三：值勤團隊（Netflix 式海報牆——聚焦卡放大發光、Ken Burns 緩推） ── */
const SceneTeam = memo(function SceneTeam({
  agents,
  onOpen,
}: {
  agents: typeof AGENTS;
  onOpen: (slug: AgentSlug) => void;
}) {
  const [focus, setFocus] = useState(0);

  // 聚焦每 3.2 秒輪到下一位（滑鼠移入任一張卡即改為手動聚焦）
  const [hovering, setHovering] = useState(false);
  useEffect(() => {
    if (hovering || agents.length === 0) return;
    const t = setInterval(() => setFocus((f) => (f + 1) % agents.length), POSTER_FOCUS_MS);
    return () => clearInterval(t);
  }, [hovering, agents.length]);

  return (
    <div>
      <p className="text-center text-xs tracking-[0.35em] text-white/40">
        值 勤 中 的 隊 友 · {agents.length}
      </p>
      <p className="mb-9 mt-2 text-center text-[11px] text-white/25">點任一位，看看他正在做什麼、做過什麼</p>
      <div
        className="mx-auto grid max-w-[1240px] grid-cols-5 gap-4"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {agents.map((agent, i) => {
          const focused = i === focus;
          return (
            <button
              key={agent.slug}
              type="button"
              onClick={() => onOpen(agent.slug)}
              onMouseEnter={() => setFocus(i)}
              className={`group relative aspect-[3/4] overflow-hidden rounded-2xl text-left transition-all duration-500 focus:outline-none ${
                focused ? "tv-focus-glow z-10 scale-[1.06]" : "scale-100 brightness-[0.55] saturate-[0.85]"
              }`}
              style={{ ["--glow-color" as string]: `${agent.color}99` }}
            >
              {/* 人像滿版（聚焦時 Ken Burns 緩推 + 表情輪播） */}
              <RotatingPortrait
                frames={avatarFrames(agent.personEn, agent.color)}
                alt={agent.personEn}
                className={`h-full w-full object-cover ${focused ? "tv-kenburns" : ""}`}
              />
              {/* 底部漸層 + 資訊 */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3 pt-10">
                <p className="text-[15px] font-semibold leading-tight text-white">
                  {agent.personEn}
                  <span className="ml-1 text-xs font-normal text-white/55">{agent.personZh}</span>
                </p>
                <p className="mt-0.5 truncate text-[11px]" style={{ color: agent.color }}>
                  {agent.role}
                </p>
                <p
                  className={`mt-1 truncate text-[10px] text-white/45 transition-opacity duration-500 ${
                    focused ? "opacity-100" : "opacity-0"
                  }`}
                >
                  正在 {DOING[agent.slug]}
                </p>
              </div>
              {/* 值勤燈 */}
              <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-[#06C755] backdrop-blur">
                <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
                值勤中
              </span>
              {/* 聚焦色框 */}
              <span
                className={`pointer-events-none absolute inset-0 rounded-2xl border-2 transition-colors duration-500 ${
                  focused ? "" : "border-transparent"
                }`}
                style={focused ? { borderColor: `${agent.color}cc` } : undefined}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});

/* ── 場景四：現正聚光（Apple TV 電影頁——模糊人像大底 + 海報 + 巨型標題） ── */
const SceneSpotlight = memo(function SceneSpotlight({
  agent,
  index,
  total,
  onOpen,
}: {
  agent: (typeof AGENTS)[number];
  index: number;
  total: number;
  onOpen: (slug: AgentSlug) => void;
}) {
  const brief = AGENT_BRIEFINGS[agent.slug];
  return (
    <div
      key={agent.slug}
      className="tv-pop relative h-[62vh] min-h-[420px] w-full overflow-hidden rounded-3xl border border-white/10"
    >
      {/* 大底：同一組人像放大模糊，染出整片氛圍色（跟著表情輪播一起換） */}
      <div className="absolute inset-0 opacity-45">
        <RotatingPortrait
          frames={avatarFrames(agent.personEn, agent.color)}
          alt=""
          className="h-full w-full scale-125 object-cover blur-2xl"
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, rgba(3,4,7,0.92) 30%, rgba(3,4,7,0.55) 60%, ${agent.color}22 100%)`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

      {/* 左：巨型標題與資訊 */}
      <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center p-8 sm:w-3/5 sm:p-14">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.3em] text-white/50">
          <span className="tv-breathe h-2 w-2 rounded-full bg-[#06C755]" />
          現 正 值 勤
        </p>
        <h2 className="mt-4 text-[clamp(2.6rem,6vw,5rem)] font-extralight leading-none text-white">
          {agent.personEn}
          <span className="ml-3 text-[0.45em] font-light text-white/45">{agent.personZh}</span>
        </h2>
        <p className="mt-3 text-lg font-medium" style={{ color: agent.color }}>
          {agent.role} · {agent.name}
        </p>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg">
          <span className="text-white/35">正在　</span>
          {DOING[agent.slug]}
        </p>
        {/* 本週三個關鍵數字（真實人設數據） */}
        <div className="mt-7 flex gap-8">
          {brief.weekStats.slice(0, 3).map((s) => (
            <div key={s.label}>
              <p className="font-mono text-2xl font-light text-white">
                {s.value}
                {s.delta && <span className="ml-1 text-xs text-[#06C755]">{s.delta}</span>}
              </p>
              <p className="mt-0.5 text-[11px] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpen(agent.slug)}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
          >
            看他正在做什麼
          </button>
          <Link
            href="/meeting"
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white/85 backdrop-blur transition-colors hover:bg-white/20"
          >
            找他開會
          </Link>
        </div>
      </div>

      {/* 右：清晰人像海報（Ken Burns 緩推） */}
      <button
        type="button"
        onClick={() => onOpen(agent.slug)}
        className="absolute bottom-10 right-10 top-10 hidden aspect-[3/4] overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-[1.03] focus:outline-none sm:block"
        style={{ boxShadow: `0 24px 70px -18px ${agent.color}66` }}
        title="點擊查看近期紀錄"
      >
        <RotatingPortrait
          frames={avatarFrames(agent.personEn, agent.color)}
          alt={agent.personEn}
          className="tv-kenburns h-full w-full object-cover"
        />
        <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#06C755] backdrop-blur">
          <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
          ON AIR
        </span>
      </button>

      {/* 序號 */}
      <p className="absolute bottom-5 right-6 font-mono text-xs tracking-widest text-white/35 sm:right-auto sm:left-14">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
    </div>
  );
});

/* ── 場景五：今日快報（Netflix Top 榜單——巨型數字 + 真實動態） ── */
const SceneHighlights = memo(function SceneHighlights({
  feed,
  onOpen,
}: {
  feed: ActivityRow[];
  onOpen: (slug: AgentSlug) => void;
}) {
  const top = useMemo(() => feed.filter((r) => r.summary).slice(0, 4), [feed]);
  const agentOf = (slug: string | null) => AGENTS.find((a) => a.slug === slug);

  return (
    <div>
      <p className="text-center text-xs tracking-[0.35em] text-white/40">今 日 快 報</p>
      <p className="mb-10 mt-2 text-center text-[11px] text-white/25">團隊最新的真實動態，持續更新中</p>

      {top.length === 0 ? (
        <p className="text-center text-sm text-white/35">今天還沒有新動態——傳一張名片到 LINE，馬上就有第一條。</p>
      ) : (
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-x-2 gap-y-5 sm:grid-cols-2">
          {top.map((row, i) => {
            const agent = agentOf(row.agent_slug);
            return (
              <button
                key={`${row.occurred_at}-${i}`}
                type="button"
                onClick={() => agent && onOpen(agent.slug)}
                className="tv-in group flex items-center gap-1 text-left focus:outline-none"
                style={{ animationDelay: `${i * 110}ms` }}
              >
                {/* 巨型排名數字（Netflix Top 10 的招牌） */}
                <span
                  className="shrink-0 select-none font-mono text-[7rem] font-bold leading-none tracking-tighter sm:text-[8.5rem]"
                  style={{
                    WebkitTextStroke: `3px ${agent?.color ?? "#3b82f6"}55`,
                    color: "transparent",
                  }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/[0.06]">
                  <div className="flex items-center gap-3">
                    {agent ? (
                      <Avatar personEn={agent.personEn} color={agent.color} size={44} />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Bell size={17} className="text-white/50" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {agent ? `${agent.personEn} ${agent.personZh}` : "系統"}
                        <span className="ml-2 text-xs font-normal text-white/35">{relTime(row.occurred_at)}</span>
                      </p>
                      <p className="text-[11px]" style={{ color: agent?.color ?? "rgba(255,255,255,0.4)" }}>
                        {agent?.role ?? "通知"}
                      </p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        row.status === "failed"
                          ? "bg-red-400/12 text-red-300"
                          : row.status === "pending"
                            ? "bg-amber-400/12 text-amber-300"
                            : "bg-[#06C755]/12 text-[#06C755]"
                      }`}
                    >
                      {row.status === "failed" ? "需要留意" : row.status === "pending" ? "進行中" : "已完成"}
                    </span>
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-white/70">{row.summary}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

interface HistoryItem {
  name: string;
  company: string | null;
  outcome: string;
  at: string;
}

const OUTCOME_TONE: Record<string, string> = {
  已寄邀約: "text-[#06C755] bg-[#06C755]/12",
  已確認: "text-[#06C755] bg-[#06C755]/12",
  待核准: "text-amber-300 bg-amber-400/12",
  待回覆: "text-amber-300 bg-amber-400/12",
  未安排: "text-white/45 bg-white/[0.08]",
  已辨識: "text-sky-300 bg-sky-400/12",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.floor(h / 24)} 天前`;
}

/* ── 劇院式細節：一位 Agent 像真人同事跟你彙報最近七天 ── */
function AgentDetail({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const brief = AGENT_BRIEFINGS[agent.slug];
  const fullReport = `${brief.greeting}${brief.report}`;
  const { shown, done, skip } = useTypewriter(fullReport);

  // 真實現正處理：每 1.5 秒輪詢；有真實任務就用真圖 + 真進度取代示意動畫
  const [live, setLive] = useState<LiveInfo | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/live-task?agent=${agent.slug}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive) setLive(d && d.active ? (d as LiveInfo) : null);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [agent.slug]);

  // 近期處理過的名片（真實歷史）
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/live-task/history?agent=${agent.slug}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => {
          if (alive) setHistory(Array.isArray(d.items) ? d.items : []);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [agent.slug]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/72 backdrop-blur-md"
      />
      <div className="tv-pop relative z-10 flex max-h-[94vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12]/95 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          title="關閉"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          {/* 左：身分列 + 大舞台（照片佔據將近半個畫面） */}
          <div className="flex shrink-0 flex-col gap-5 p-5 sm:p-7 lg:w-[58%] lg:overflow-y-auto">
            {/* 身分列（橫向精簡） */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <span
                  className="absolute -inset-2 rounded-full blur-xl"
                  style={{ background: `radial-gradient(circle, ${agent.color}55, transparent 70%)` }}
                />
                {!done && (
                  <span
                    className="tv-ping absolute -inset-1 rounded-full border-2"
                    style={{ borderColor: agent.color }}
                  />
                )}
                <div className="relative">
                  <Avatar personEn={agent.personEn} color={agent.color} size={68} />
                  <span
                    className="tv-breathe absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-[#0b0d12] bg-[#06C755]"
                    style={{ boxShadow: "0 0 12px 2px rgba(6,199,85,0.7)" }}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-light text-white">
                  {agent.personEn}
                  <span className="ml-1.5 text-white/40">{agent.personZh}</span>
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm" style={{ color: agent.color }}>
                    {agent.role}
                  </span>
                  {done ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#06C755]/15 px-2.5 py-0.5 text-xs font-medium text-[#06C755]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#06C755]" />
                      值勤中
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-[#06C755]">
                      <span className="flex h-3 items-end gap-[3px]">
                        {[0, 120, 240, 360].map((d) => (
                          <i
                            key={d}
                            className="tv-wave block w-[3px] rounded-full bg-[#06C755]"
                            style={{ height: "100%", animationDelay: `${d}ms` }}
                          />
                        ))}
                      </span>
                      彙報中…
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 大舞台：現正處理的照片 + 階段流水線 */}
            <LiveTask
              agentSlug={agent.slug}
              def={AGENT_LIVE_TASKS[agent.slug]}
              color={agent.color}
              live={live}
              screenHeight="h-[42vh] lg:h-[50vh]"
            />
          </div>

          {/* 右：彙報內容（可捲動） */}
          <div className="flex min-h-0 flex-col gap-6 border-t border-white/8 p-5 sm:p-7 lg:flex-1 lg:overflow-y-auto lg:border-l lg:border-t-0">
            {/* 最近七天彙報（打字機） */}
            <button
              type="button"
              onClick={skip}
              className="w-full cursor-default rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left"
            >
              <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/40">
                <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-[#06C755]" />
                最近七天彙報
              </p>
              <p className="min-h-[3.5em] text-[15px] leading-relaxed text-white/90">
                {shown}
                {!done && <span className="office-blink ml-0.5 text-[#06C755]">▍</span>}
              </p>
            </button>

            {/* 彙報完才揭曉：數字、任務重點、產出（滑入） */}
            {done && (
              <div className="space-y-6">
                <div className="tv-in grid grid-cols-3 gap-3">
                  {brief.weekStats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-center"
                    >
                      <p className="font-mono text-xl font-light text-white">
                        {s.value}
                        {s.delta && <span className="ml-1 text-xs text-[#06C755]">{s.delta}</span>}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/40">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="tv-in" style={{ animationDelay: "80ms" }}>
                  <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-white/40">目前任務重點</p>
                  <ul className="space-y-2">
                    {brief.focus.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: agent.color }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="tv-in" style={{ animationDelay: "160ms" }}>
                  <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-white/40">最近的產出</p>
                  <ul className="space-y-2.5">
                    {brief.outputs.map((o) => (
                      <li
                        key={o.label}
                        className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: `${agent.color}1f`, color: agent.color }}
                        >
                          {OUTPUT_ICON[o.kind]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white/90">{o.label}</p>
                          <p className="truncate text-xs text-white/40">{o.meta}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 近期處理過的名片（真實歷史） */}
            {history.length > 0 && (
              <div>
                <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-white/40">近期處理的名片</p>
                <ul className="space-y-2">
                  {history.map((h, i) => (
                    <li
                      key={`${h.name}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white/90">
                          {h.name}
                          {h.company && <span className="text-white/40"> · {h.company}</span>}
                        </p>
                        <p className="text-xs text-white/35">{relTime(h.at)}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          OUTCOME_TONE[h.outcome] ?? "text-white/45 bg-white/[0.08]"
                        }`}
                      >
                        {h.outcome}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
