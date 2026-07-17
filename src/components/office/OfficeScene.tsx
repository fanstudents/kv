"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/agent-data";
import Avatar from "@/components/agents/Avatar";
import type { AgentMeta } from "@/lib/types";

interface ActivityRow {
  id: string;
  agent_slug: string | null;
  occurred_at: string;
  status: "success" | "failed" | "pending";
}

function TypingDots() {
  return (
    <div className="flex h-5 items-end gap-0.5 rounded-full bg-white/90 px-2 py-1 shadow-sm">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#06C755]"
          style={{ animation: `office-typing 1.1s ease-in-out ${i * 0.18}s infinite` }}
        />
      ))}
    </div>
  );
}

function CoffeeBreak() {
  return (
    <div className="relative flex h-5 items-center justify-center">
      <span className="text-sm">☕</span>
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute -top-1 h-2 w-0.5 rounded-full bg-neutral-400/70"
          style={{ left: `${46 + i * 10}%`, animation: `office-steam 1.8s ease-out ${i * 0.5}s infinite` }}
        />
      ))}
    </div>
  );
}

function Snooze() {
  return (
    <div className="relative h-5 w-8">
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute bottom-0 text-[10px] font-bold text-sky-400"
          style={{ left: i * 10, animation: `office-snooze 2.4s ease-out ${i * 0.9}s infinite` }}
        >
          z
        </span>
      ))}
    </div>
  );
}

function Monitor({ working }: { working: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`h-9 w-13 rounded-md border-2 border-neutral-700 bg-neutral-900 p-1 ${
          working ? "shadow-[0_0_10px_rgba(6,199,85,0.45)]" : ""
        }`}
        style={{ width: 52 }}
      >
        {working ? (
          <div className="flex h-full flex-col justify-center gap-0.5 px-0.5">
            <span className="h-0.5 w-3/4 rounded bg-[#06C755]/80" />
            <span className="h-0.5 w-1/2 rounded bg-[#06C755]/50" />
            <span className="office-blink h-0.5 w-2/3 rounded bg-[#06C755]" />
          </div>
        ) : (
          <div className="h-full rounded-sm bg-neutral-800" />
        )}
      </div>
      <div className="h-1.5 w-2 bg-neutral-700" />
      <div className="h-1 w-6 rounded-sm bg-neutral-600" />
    </div>
  );
}

function Desk({
  agent,
  count24h,
  celebrating,
}: {
  agent: AgentMeta;
  count24h: number;
  celebrating: boolean;
}) {
  const working = agent.status === "active";

  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group relative flex flex-col items-center transition-transform hover:-translate-y-1"
    >
      {/* 桌面上方的狀態提示區 */}
      <div className="relative z-20 flex h-8 items-end justify-center">
        {celebrating ? (
          <div className="office-float-up whitespace-nowrap rounded-full bg-[#06C755] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            🎉 任務完成！
          </div>
        ) : working ? (
          <TypingDots />
        ) : agent.status === "paused" ? (
          <CoffeeBreak />
        ) : (
          <Snooze />
        )}
      </div>

      {/* 人物 */}
      <div className={working ? "office-bob relative z-0" : "relative z-0"}>
        <Avatar personEn={agent.personEn} color={agent.color} size={54} />
        {count24h > 0 && (
          <span className="office-pop absolute -right-1.5 -top-1 z-30 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#06C755] px-1 text-[10px] font-bold text-white shadow">
            {count24h}
          </span>
        )}
      </div>

      {/* 螢幕 + 辦公桌 */}
      <div className="relative z-10 -mt-2 flex flex-col items-center">
        <Monitor working={working} />
        <div
          className="-mt-0.5 h-8 w-28 rounded-lg shadow-md"
          style={{ background: "linear-gradient(180deg, #C9955F 0%, #A9744A 60%, #8F5F3B 100%)" }}
        />
        <div className="flex w-24 justify-between px-2">
          <span className="h-3 w-1.5 rounded-b bg-[#7A4E2E]" />
          <span className="h-3 w-1.5 rounded-b bg-[#7A4E2E]" />
        </div>
      </div>

      {/* 名牌 */}
      <div
        className="z-20 -mt-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-sm"
        style={{ backgroundColor: agent.color }}
      >
        {agent.shortName}
      </div>
      <p className="mt-0.5 text-[10px] font-medium text-[#6E4527]">
        {agent.personEn} {agent.personZh}
      </p>
    </Link>
  );
}

export default function OfficeScene() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [celebrating, setCelebrating] = useState<Set<string>>(new Set());
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

  return (
    <div className="overflow-hidden rounded-3xl border border-[#E2D3BC] shadow-sm">
      {/* 牆面 */}
      <div
        className="relative h-32"
        style={{ background: "linear-gradient(180deg, #F7EDDD 0%, #F1E3CC 100%)" }}
      >
        {/* 掛牌 */}
        <div className="office-sway absolute left-1/2 top-0 z-10 -translate-x-1/2">
          <div className="flex justify-center gap-16">
            <span className="h-5 w-0.5 bg-neutral-400" />
            <span className="h-5 w-0.5 bg-neutral-400" />
          </div>
          <div
            className="rounded-lg border-4 border-[#6E4527] px-6 py-2 shadow-md"
            style={{ background: "linear-gradient(180deg, #A9744A 0%, #8F5F3B 100%)" }}
          >
            <p className="whitespace-nowrap text-lg font-black tracking-widest text-white drop-shadow">
              原騰數位科技
            </p>
            <p className="text-center text-[9px] font-medium tracking-[0.3em] text-[#F7EDDD]">
              AI AGENT OFFICE
            </p>
          </div>
        </div>

        {/* 窗戶 */}
        <div className="absolute left-6 top-6 hidden h-16 w-24 rounded-lg border-4 border-white shadow-sm sm:block" style={{ background: "linear-gradient(180deg, #BCE0F5 0%, #DDF0FB 100%)" }}>
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-white" />
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 bg-white" />
          <span className="absolute left-1 top-1 text-[10px]">☁️</span>
        </div>

        {/* 時鐘 */}
        <div className="absolute right-8 top-6 hidden h-12 w-12 items-center justify-center rounded-full border-4 border-[#6E4527] bg-white shadow-sm sm:flex">
          <div className="relative h-full w-full">
            <span className="absolute left-1/2 top-1/2 h-3 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rotate-45 rounded bg-neutral-700" />
            <span className="absolute left-1/2 top-1/2 h-2 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full -rotate-90 rounded bg-neutral-500" />
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-800" />
          </div>
        </div>
      </div>

      {/* 地板（棋盤磁磚） */}
      <div
        className="relative px-4 pb-6 pt-2 sm:px-8"
        style={{
          background: "repeating-conic-gradient(#EADFC9 0% 25%, #F4ECDB 0% 50%) 50% / 64px 64px",
        }}
      >
        <span className="absolute bottom-3 left-3 text-xl sm:text-2xl">🪴</span>
        <span className="absolute bottom-3 right-3 text-xl sm:text-2xl">🗄️</span>

        <div className="grid grid-cols-3 gap-x-2 gap-y-4 pt-2 lg:grid-cols-3 xl:gap-x-6">
          {AGENTS.map((agent) => (
            <Desk
              key={agent.slug}
              agent={agent}
              count24h={counts[agent.slug] ?? 0}
              celebrating={celebrating.has(agent.slug)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
