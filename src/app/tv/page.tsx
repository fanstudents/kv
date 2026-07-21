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
  X,
} from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import LiveTask, { type LiveInfo } from "@/components/tv/LiveTask";
import { AGENTS } from "@/lib/agent-data";
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
  const [openAgent, setOpenAgent] = useState<AgentSlug | null>(null);

  const activeAgents = useMemo(() => AGENTS.filter((a) => a.status === "active"), []);
  const activeCount = activeAgents.length;
  const recipients = useMemo(() => AGENTS.reduce((sum, a) => sum + a.recipients, 0), []);

  const openDetail = useCallback((slug: AgentSlug) => setOpenAgent(slug), []);
  const closeDetail = useCallback(() => setOpenAgent(null), []);

  // 自動輪播場景（可暫停；展開細節時也暫停）
  useEffect(() => {
    if (!autoplay || openAgent) return;
    const t = setInterval(() => {
      setDir(1);
      setScene((i) => (i + 1) % N);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [autoplay, scene, openAgent]);

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
  }, [openAgent]);

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
        <Link
          href="/meeting"
          title="開一場視訊會議"
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_20px_-4px_rgba(6,199,85,0.7)] transition-transform hover:scale-105"
        >
          <Video size={15} />
          開會
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

      {/* 場景舞台（一次只專注一件事） */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-28">
        <div key={scene} className={`${slideClass} w-full max-w-[1320px]`}>
          {scene === 0 && <SceneNow activeCount={activeCount} />}
          {scene === 1 && (
            <SceneOverview activeCount={activeCount} total={AGENTS.length} recipients={recipients} />
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
        </div>
      </div>

      {/* 點擊 Agent → 劇院式細節（正在做什麼、做過什麼） */}
      {openAgent && (
        <AgentDetail agent={AGENTS.find((a) => a.slug === openAgent) as Agent} onClose={closeDetail} />
      )}

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

/* ── 場景三：值勤團隊（寬鬆的頭像牆，可點擊展開） ── */
const SceneTeam = memo(function SceneTeam({
  agents,
  onOpen,
}: {
  agents: typeof AGENTS;
  onOpen: (slug: AgentSlug) => void;
}) {
  return (
    <div>
      <p className="text-center text-xs tracking-[0.35em] text-white/40">
        值 勤 中 的 隊 友 · {agents.length}
      </p>
      <p className="mb-11 mt-2 text-center text-[11px] text-white/25">點任一位，看看他正在做什麼、做過什麼</p>
      <div className="mx-auto grid max-w-[1160px] grid-cols-3 gap-x-6 gap-y-12 sm:grid-cols-5">
        {agents.map((agent, i) => (
          <button
            key={agent.slug}
            type="button"
            onClick={() => onOpen(agent.slug)}
            className="tv-in flex flex-col items-center gap-3 text-center transition-transform duration-300 hover:-translate-y-1 focus:outline-none"
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
          </button>
        ))}
      </div>
    </div>
  );
});

/* ── 場景四:現正聚光（單一 Agent 放大，可點擊展開） ── */
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
  return (
    <div key={agent.slug} className="tv-pop flex flex-col items-center text-center">
      <button
        type="button"
        onClick={() => onOpen(agent.slug)}
        className="relative transition-transform duration-300 hover:scale-105 focus:outline-none"
        title="點擊查看近期紀錄"
      >
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
      </button>

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

      <button
        type="button"
        onClick={() => onOpen(agent.slug)}
        className="mt-7 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-xs text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
      >
        查看近期紀錄
      </button>

      <p className="mt-5 font-mono text-xs tracking-widest text-white/30">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
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
