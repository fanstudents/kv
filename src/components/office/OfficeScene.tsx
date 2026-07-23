"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Maximize2, Megaphone, MonitorPlay, X } from "lucide-react";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import Avatar from "@/components/agents/Avatar";
import { useMarketingMode } from "@/lib/marketing-mode";
import type { AgentMeta } from "@/lib/types";

interface ActivityRow {
  id: string;
  agent_slug: string | null;
  occurred_at: string;
  status: "success" | "failed" | "pending";
}

// 場景定義：左右箭頭可在場景間切換（畫面用橫向滑動連接）
const SCENES = [
  { id: "office", name: "辦公區", bg: "/office-bg.jpg" },
  { id: "warroom", name: "資訊戰情室", bg: "/office-warroom.jpg" },
  { id: "execoffice", name: "主管辦公室", bg: "/office-execoffice.jpg" },
] as const;

// 每位成員所在的場景（未列出者預設在辦公區）
const AGENT_SCENE: Record<string, (typeof SCENES)[number]["id"]> = {
  teamlead: "execoffice",
  notify: "warroom",
  report: "warroom",
  competitor: "warroom",
};

// 走動路徑：沿著各場景的走道（座標為該場景畫面的百分比位置）
const WALK_PATHS: Record<string, { frames: string; duration: number; delay: number }> = {
  // 大總管在主管辦公室裡的辦公桌與會客區之間走動
  teamlead: {
    frames:
      "0%{left:50%;top:44%}30%{left:50%;top:66%}45%{left:40%;top:74%}60%{left:50%;top:66%}80%{left:22%;top:60%}100%{left:50%;top:44%}",
    duration: 34,
    delay: -8,
  },
  // 辦公區找不到專屬路徑的成員，預設走這條（沿用舊版 notify 的路徑，避免搬動 notify 後跟著跑位）
  officeDefault: {
    frames: "0%{left:18%;top:36%}25%{left:50%;top:36%}50%{left:50%;top:63%}75%{left:18%;top:63%}100%{left:18%;top:36%}",
    duration: 28,
    delay: 0,
  },
  // 資訊戰情室三張監控桌，各自小範圍待機（不橫越整個房間）
  notify: {
    frames: "0%{left:23%;top:60%}50%{left:26%;top:64%}100%{left:23%;top:60%}",
    duration: 5,
    delay: 0,
  },
  report: {
    frames: "0%{left:49%;top:58%}50%{left:52%;top:62%}100%{left:49%;top:58%}",
    duration: 5.6,
    delay: -2,
  },
  competitor: {
    frames: "0%{left:75%;top:60%}50%{left:78%;top:64%}100%{left:75%;top:60%}",
    duration: 6.2,
    delay: -3.5,
  },
  schedule: {
    frames: "0%{left:50%;top:13%}25%{left:79%;top:13%}50%{left:79%;top:63%}75%{left:50%;top:63%}100%{left:50%;top:13%}",
    duration: 38,
    delay: -15,
  },
  visit: {
    frames: "0%{left:31%;top:87%}25%{left:68%;top:87%}50%{left:68%;top:63%}75%{left:31%;top:63%}100%{left:31%;top:87%}",
    duration: 26,
    delay: -5,
  },
  operations: {
    frames: "0%{left:10%;top:36%}25%{left:10%;top:87%}50%{left:50%;top:87%}75%{left:50%;top:36%}100%{left:10%;top:36%}",
    duration: 42,
    delay: -20,
  },
};

const FALLBACK_WALK = WALK_PATHS.officeDefault;

// 暫停中的座位（喝咖啡）：右上角圓桌會議區
const COFFEE_SPOTS = [{ left: "88.5%", top: "22%" }];

// 草稿（打瞌睡）安排在空桌的座位上
const SLEEP_SPOTS = [
  { left: "40%", top: "29%" },
  { left: "77%", top: "56%" },
  { left: "22%", top: "80%" },
  { left: "59%", top: "29%" },
  { left: "18%", top: "56%" },
];

function TypingDots() {
  return (
    <div className="flex h-4 items-end gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 shadow-sm">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full bg-[#06C755]"
          style={{ animation: `office-typing 1.1s ease-in-out ${i * 0.18}s infinite` }}
        />
      ))}
    </div>
  );
}

function CoffeeBreak() {
  return (
    <div className="relative flex h-4 items-center justify-center">
      <span className="text-xs">☕</span>
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute -top-1 h-1.5 w-0.5 rounded-full bg-neutral-400/70"
          style={{ left: `${46 + i * 10}%`, animation: `office-steam 1.8s ease-out ${i * 0.5}s infinite` }}
        />
      ))}
    </div>
  );
}

function Snooze() {
  return (
    <div className="relative h-4 w-7">
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute bottom-0 text-[9px] font-bold text-sky-500 drop-shadow"
          style={{ left: i * 9, animation: `office-snooze 2.4s ease-out ${i * 0.9}s infinite` }}
        >
          z
        </span>
      ))}
    </div>
  );
}

function Person({
  agent,
  count24h,
  celebrating,
}: {
  agent: AgentMeta;
  count24h: number;
  celebrating: boolean;
}) {
  const walking = agent.status === "active";
  const walk = WALK_PATHS[agent.slug] ?? FALLBACK_WALK;

  const spotIndex = AGENTS.filter((a) => a.status === agent.status).findIndex((a) => a.slug === agent.slug);
  const positionStyle: React.CSSProperties = walking
    ? { animation: `walk-${agent.slug in WALK_PATHS ? agent.slug : "officeDefault"} ${walk.duration}s ease-in-out ${walk.delay}s infinite` }
    : agent.status === "paused"
      ? COFFEE_SPOTS[spotIndex % COFFEE_SPOTS.length]
      : SLEEP_SPOTS[spotIndex % SLEEP_SPOTS.length];

  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform hover:z-40 hover:scale-110"
      style={positionStyle}
      title={`${agent.name}：${agent.personEn} ${agent.personZh}`}
    >
      <div className="flex flex-col items-center">
        <div className="relative z-20 flex h-5 items-end justify-center">
          {celebrating ? (
            <div className="office-float-up whitespace-nowrap rounded-full bg-[#06C755] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
              🎉 任務完成！
            </div>
          ) : walking ? (
            <TypingDots />
          ) : agent.status === "paused" ? (
            <CoffeeBreak />
          ) : (
            <Snooze />
          )}
        </div>

        <div className={walking ? "office-bob relative" : "relative"}>
          <span className="block rounded-full shadow-lg ring-2 ring-white">
            <Avatar personEn={agent.personEn} color={agent.color} size={44} />
          </span>
          {count24h > 0 && (
            <span className="office-pop absolute -right-1.5 -top-1 z-30 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-[#06C755] px-1 text-[9px] font-bold text-white shadow">
              {count24h}
            </span>
          )}
        </div>

        <div
          className="z-20 mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
          style={{ backgroundColor: agent.color }}
        >
          {agent.shortName}
        </div>
      </div>
    </Link>
  );
}

function DoorPlate({ sceneId }: { sceneId: (typeof SCENES)[number]["id"] }) {
  if (sceneId === "office") {
    return (
      <div className="office-sway absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <div className="flex justify-center gap-14">
          <span className="h-4 w-0.5 bg-neutral-500/60" />
          <span className="h-4 w-0.5 bg-neutral-500/60" />
        </div>
        <div
          className="rounded-lg border-4 border-[#6E4527] px-5 py-1.5 shadow-lg"
          style={{ background: "linear-gradient(180deg, #A9744A 0%, #8F5F3B 100%)" }}
        >
          <p className="whitespace-nowrap text-base font-black tracking-widest text-white drop-shadow">原騰數位科技</p>
          <p className="text-center text-[8px] font-medium tracking-[0.3em] text-[#F7EDDD]">AI AGENT OFFICE</p>
        </div>
      </div>
    );
  }
  if (sceneId === "warroom") {
    return (
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg border border-sky-300/40 bg-[#0B1F3A]/85 px-5 py-1.5 shadow-lg backdrop-blur-sm">
        <p className="whitespace-nowrap text-sm font-black tracking-widest text-sky-100">資訊戰情室</p>
        <p className="text-center text-[8px] font-medium tracking-[0.3em] text-sky-300/80">COMMAND CENTER</p>
      </div>
    );
  }
  return (
    <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg border border-amber-200/60 bg-[#2B2117]/85 px-5 py-1.5 shadow-lg backdrop-blur-sm">
      <p className="whitespace-nowrap text-sm font-black tracking-widest text-amber-100">主管辦公室</p>
      <p className="text-center text-[8px] font-medium tracking-[0.3em] text-amber-200/70">EXECUTIVE OFFICE</p>
    </div>
  );
}

// 全螢幕檢視時的左側面板：Agent team 列表，點名字前往該 Agent 的詳情頁
function TeamList({ counts, agents, marketingMode }: { counts: Record<string, number>; agents: AgentMeta[]; marketingMode: boolean }) {
  const renderRow = (agent: AgentMeta) => (
    <Link
      key={agent.slug}
      href={`/agents/${agent.slug}`}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Avatar personEn={agent.personEn} color={agent.color} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{agent.name}</span>
        <span className="block truncate text-xs font-normal text-white/40">
          {agent.personEn} {agent.personZh} · {agent.role}
        </span>
      </span>
      {(counts[agent.slug] ?? 0) > 0 && (
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#06C755]/20 px-1.5 text-[10px] font-bold text-[#06C755]">
          {counts[agent.slug]}
        </span>
      )}
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          agent.status === "active"
            ? "animate-pulse bg-[#06C755]"
            : agent.status === "paused"
              ? "bg-amber-500"
              : "bg-white/20"
        }`}
      />
    </Link>
  );

  return (
    <div className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-black/70 px-3 py-5 backdrop-blur-xl">
      <p className="px-2.5 pb-1 text-sm font-semibold text-white">{marketingMode ? "行銷戰隊" : "Agent Team"}</p>
      <p className="px-2.5 pb-4 text-xs text-white/40">
        {marketingMode ? `你是 AI 行銷指揮官，率領 ${agents.length} 位隊員` : `${agents.length} 位隊友，點名字查看細節`}
      </p>
      <p className="px-2.5 pb-1 text-xs font-semibold tracking-wide text-white/40">行銷 Team</p>
      <div className="space-y-0.5">{agents.filter((a) => agentTeam(a.slug) === "marketing").map(renderRow)}</div>
      {!marketingMode && (
        <>
          <p className="px-2.5 pb-1 pt-4 text-xs font-semibold tracking-wide text-white/40">行政 Team</p>
          <div className="space-y-0.5">{agents.filter((a) => agentTeam(a.slug) === "admin").map(renderRow)}</div>
        </>
      )}
    </div>
  );
}

export default function OfficeScene() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [celebrating, setCelebrating] = useState<Set<string>>(new Set());
  const [sceneIndex, setSceneIndex] = useState(0);
  const [fullView, setFullView] = useState(false);
  const [marketingMode] = useMarketingMode();
  const visibleAgents = marketingMode ? AGENTS.filter((a) => agentTeam(a.slug) === "marketing") : AGENTS;

  // 全螢幕檢視時 Esc 可退出
  useEffect(() => {
    if (!fullView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullView(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullView]);
  const prevLatestSuccess = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/activity?limit=300");
        if (!res.ok) return;
        const rows: ActivityRow[] = await res.json();
        if (cancelled || !Array.isArray(rows)) return;

        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const nextCounts: Record<string, number> = {};
        const latestSuccess: Record<string, string> = {};

        for (const row of rows) {
          if (!row.agent_slug || row.status !== "success") continue;
          if (new Date(row.occurred_at).getTime() >= cutoff) {
            nextCounts[row.agent_slug] = (nextCounts[row.agent_slug] ?? 0) + 1;
          }
          if (!latestSuccess[row.agent_slug]) latestSuccess[row.agent_slug] = row.id;
        }

        setCounts(nextCounts);

        // 跟上一次輪詢比對：有新的成功紀錄 → 播放慶祝動畫
        const prev = prevLatestSuccess.current;
        if (prev) {
          for (const [slug, id] of Object.entries(latestSuccess)) {
            if (prev[slug] && prev[slug] !== id) {
              setCelebrating((s) => new Set(s).add(slug));
              setTimeout(() => {
                setCelebrating((s) => {
                  const next = new Set(s);
                  next.delete(slug);
                  return next;
                });
              }, 3500);
            }
          }
        }
        prevLatestSuccess.current = latestSuccess;
      } catch {
        // ignore polling errors
      }
    };

    load();
    const timer = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const walkKeyframes = Object.entries(WALK_PATHS)
    .map(([slug, p]) => `@keyframes walk-${slug}{${p.frames}}`)
    .join("\n");

  // 非循環：到最左/最右就停用該方向箭頭，方向與位移一致（往左看左邊場景、往右看右邊場景）
  const canPrev = sceneIndex > 0;
  const canNext = sceneIndex < SCENES.length - 1;
  const goPrev = () => canPrev && setSceneIndex((i) => i - 1);
  const goNext = () => canNext && setSceneIndex((i) => i + 1);
  const prevScene = canPrev ? SCENES[sceneIndex - 1] : null;
  const nextScene = canNext ? SCENES[sceneIndex + 1] : null;

  const sceneContent = (
    <>
      <style>{walkKeyframes}</style>

      {/* 場景滑軌：橫向排列所有場景，用 translateX 做移動式切換 */}
      <div
        className="flex h-full"
        style={{
          width: `${SCENES.length * 100}%`,
          transform: `translateX(-${(100 / SCENES.length) * sceneIndex}%)`,
          transition: "transform 0.7s cubic-bezier(0.65,0,0.35,1)",
        }}
      >
        {SCENES.map((s) => {
          const sceneAgents = visibleAgents.filter((a) => (AGENT_SCENE[a.slug] ?? "office") === s.id);
          return (
            <div
              key={s.id}
              className="relative h-full shrink-0"
              style={{
                width: `${100 / SCENES.length}%`,
                backgroundImage: `url(${s.bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <DoorPlate sceneId={s.id} />
              {sceneAgents.map((agent) => (
                <Person
                  key={agent.slug}
                  agent={agent}
                  count24h={counts[agent.slug] ?? 0}
                  celebrating={celebrating.has(agent.slug)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* 場景指示 */}
      <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSceneIndex(i)}
            aria-label={s.name}
            title={s.name}
            className={`h-2 rounded-full transition-all ${
              i === sceneIndex ? "w-6 bg-white shadow" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      {/* 左右切換場景，hover 時標示目的地名稱；到頭/到尾就不顯示該方向箭頭 */}
      {prevScene && (
        <button
          type="button"
          onClick={goPrev}
          className="group absolute left-0 top-0 z-30 flex h-full w-20 items-center justify-start pl-2"
          aria-label={`前往${prevScene.name}`}
        >
          <span className="flex items-center gap-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/35 text-lg text-white opacity-60 shadow-lg backdrop-blur-sm transition-all group-hover:scale-110 group-hover:opacity-100">
              ‹
            </span>
            <span className="translate-x-[-6px] whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow backdrop-blur-sm transition-all group-hover:translate-x-0 group-hover:opacity-100">
              {prevScene.name}
            </span>
          </span>
        </button>
      )}
      {nextScene && (
        <button
          type="button"
          onClick={goNext}
          className="group absolute right-0 top-0 z-30 flex h-full w-20 items-center justify-end pr-2"
          aria-label={`前往${nextScene.name}`}
        >
          <span className="flex items-center gap-1.5">
            <span className="translate-x-[6px] whitespace-nowrap rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow backdrop-blur-sm transition-all group-hover:translate-x-0 group-hover:opacity-100">
              {nextScene.name}
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/35 text-lg text-white opacity-60 shadow-lg backdrop-blur-sm transition-all group-hover:scale-110 group-hover:opacity-100">
              ›
            </span>
          </span>
        </button>
      )}
    </>
  );

  if (fullView) {
    return (
      <div className="fixed inset-0 z-50 flex bg-black">
        <TeamList counts={counts} agents={visibleAgents} marketingMode={marketingMode} />
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {sceneContent}

          {/* 右上角：切換進完整劇場模式、或退出全螢幕檢視 */}
          <div className="absolute right-4 top-4 z-40 flex items-center gap-2">
            {marketingMode && (
              <span
                title="你是 AI 行銷指揮官，畫面只顯示行銷戰隊隊員"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-200"
              >
                <Megaphone size={13} />
                行銷模式
              </span>
            )}
            <Link
              href="/tv"
              title="切換成劇場模式"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-black shadow-[0_0_20px_-4px_rgba(6,199,85,0.7)] transition-transform hover:scale-105"
            >
              <MonitorPlay size={15} />
              劇場模式
            </Link>
            <button
              type="button"
              onClick={() => setFullView(false)}
              title="退出全螢幕"
              aria-label="退出全螢幕"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-[#E2D3BC] shadow-sm"
      style={{ aspectRatio: "16 / 9" }}
    >
      {sceneContent}

      <button
        type="button"
        onClick={() => setFullView(true)}
        title="全螢幕檢視"
        aria-label="全螢幕檢視"
        className="absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white opacity-70 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:opacity-100"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
