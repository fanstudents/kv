"use client";

import { useEffect, useState } from "react";
import type { AgentLiveDef, PropKind } from "@/lib/agent-briefings";
import type { AgentSlug } from "@/lib/types";
import FlowGraph from "./FlowGraph";
import IdleScene from "./IdleScene";

/* 各職務的道具視覺（真實任務進行中、但沒有實照可放時演出用） */
function PropGraphic({ kind, color }: { kind: PropKind; color: string }) {
  if (kind === "chart") {
    const bars = [0.5, 0.82, 0.4, 1, 0.66, 0.55];
    return (
      <div className="flex h-20 items-end gap-1.5">
        {bars.map((h, i) => (
          <i
            key={i}
            className="live-bar block w-3 rounded-t-sm"
            style={{ height: `${h * 100}%`, background: color, animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    );
  }
  if (kind === "chat") {
    return (
      <div className="w-52 space-y-2">
        <div className="h-5 w-32 rounded-lg rounded-tl-sm bg-white/12" />
        <div className="ml-auto h-4 w-20 rounded-lg rounded-tr-sm" style={{ background: `${color}55` }} />
        <div className="flex w-12 items-center gap-1 rounded-lg rounded-tl-sm bg-white/12 px-2.5 py-2">
          {[0, 1, 2].map((i) => (
            <i
              key={i}
              className="office-typing h-1.5 w-1.5 rounded-full bg-white/70"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (kind === "radar") {
    return (
      <div className="relative h-24 w-24 rounded-full border border-white/15">
        <div className="absolute inset-[18%] rounded-full border border-white/10" />
        <div className="absolute inset-[38%] rounded-full border border-white/10" />
        <div
          className="live-radar absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(from 0deg, transparent 296deg, ${color}66 358deg)` }}
        />
        <span className="absolute h-1.5 w-1.5 rounded-full" style={{ background: color, top: "28%", left: "62%" }} />
      </div>
    );
  }
  if (kind === "calendar") {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1 w-6 rounded-sm bg-white/20" />
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-6 rounded-sm ${i === 7 ? "tv-breathe" : ""}`}
              style={{ background: i === 7 ? color : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (kind === "compose") {
    return (
      <div className="w-52 rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
        <div className="h-2 w-20 rounded-sm" style={{ background: color }} />
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-44 rounded-sm bg-white/15" />
          <div className="h-1.5 w-36 rounded-sm bg-white/15" />
          <div className="flex items-center">
            <div className="h-1.5 w-24 rounded-sm bg-white/15" />
            <span className="office-blink ml-1 h-3.5 w-0.5" style={{ background: color }} />
          </div>
        </div>
      </div>
    );
  }
  if (kind === "card") {
    return (
      <div className="w-44 -rotate-3 rounded-md bg-neutral-100 p-3 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-2.5 w-16 rounded-sm bg-neutral-800" />
            <div className="mt-1.5 h-1.5 w-10 rounded-sm bg-neutral-400" />
          </div>
          <span className="h-5 w-5 rounded-full" style={{ background: color }} />
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-1 w-24 rounded-sm bg-neutral-300" />
          <div className="h-1 w-16 rounded-sm bg-neutral-300" />
        </div>
      </div>
    );
  }
  // doc
  return (
    <div className="w-48 rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
      <div className="h-2 w-24 rounded-sm" style={{ background: color }} />
      <div className="mt-3 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full border" style={{ borderColor: color }} />
            <span className="h-1.5 rounded-sm bg-white/15" style={{ width: `${8 - i}rem` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface LiveInfo {
  active: boolean;
  step: number;
  status: "active" | "waiting" | "done";
  caption: string | null;
  hasImage: boolean;
  imageVersion: number;
}

function Brackets({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute -inset-6">
      {[
        "left-0 top-0 border-l-2 border-t-2",
        "right-0 top-0 border-r-2 border-t-2",
        "left-0 bottom-0 border-b-2 border-l-2",
        "right-0 bottom-0 border-b-2 border-r-2",
      ].map((pos) => (
        <span key={pos} className={`absolute h-6 w-6 ${pos}`} style={{ borderColor: color }} />
      ))}
    </div>
  );
}

/* 待命跑馬燈：輪播「正在做的小事」，讓 Agent 看起來一直活著 */
function Ticker({ lines, color }: { lines: string[]; color: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (lines.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % lines.length), 3800);
    return () => clearInterval(t);
  }, [lines.length]);
  if (lines.length === 0) return null;
  return (
    <span key={idx} className="tv-in flex items-center gap-1.5 text-xs text-white/45">
      <span className="h-1 w-1 rounded-full" style={{ background: color }} />
      {lines[idx]}
    </span>
  );
}

export default function LiveTask({
  agentSlug,
  def,
  color,
  live,
  screenHeight = "h-80 sm:h-[26rem]",
}: {
  agentSlug: AgentSlug;
  def: AgentLiveDef;
  color: string;
  live?: LiveInfo | null;
  /** 舞台（場景螢幕）高度，可由外層放大 */
  screenHeight?: string;
}) {
  const isLive = Boolean(live?.active);
  const isWaiting = isLive && live!.status === "waiting";
  const imageUrl = isLive && live!.hasImage ? `/api/live-task/image?agent=${agentSlug}&v=${live!.imageVersion}` : null;

  return (
    <div>
      {/* 場景螢幕 */}
      <div
        className={`relative ${screenHeight} overflow-hidden rounded-2xl border bg-[#06090d]`}
        style={{ borderColor: isLive ? `${color}66` : "rgba(255,255,255,0.08)" }}
      >
        {/* 細格線 */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {isLive ? (
          <>
            {/* 掃描線（只有真的在處理時才掃） */}
            <div
              className="live-scan absolute inset-x-0 top-0 h-12"
              style={{ background: `linear-gradient(180deg, transparent, ${color}22 60%, ${color}44)` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {imageUrl ? (
                <div className="relative">
                  <Brackets color={color} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="現正處理的圖片"
                    className="max-h-[86%] w-auto max-w-[92%] rounded-lg object-contain shadow-2xl"
                  />
                </div>
              ) : (
                <PropGraphic kind={def.prop} color={color} />
              )}
            </div>
            <span className="absolute left-4 top-4 flex max-w-[92%] items-center gap-2 truncate text-xs font-semibold tracking-[0.18em] text-white/60">
              <span
                className="tv-breathe h-2 w-2 rounded-full"
                style={{ background: isWaiting ? "#F59E0B" : color }}
              />
              {isWaiting ? "等待指示" : "真實處理"}・{live!.caption ?? "現正處理"}
            </span>
          </>
        ) : (
          <>
            {/* 待命：每位 Agent 桌上擺著自己的工作場景（報表、行事曆、監控盤……） */}
            <div className="absolute inset-x-0 bottom-12 top-12 flex items-center justify-center overflow-y-auto px-5">
              <IdleScene slug={agentSlug} color={color} />
            </div>
            <span className="absolute left-4 top-4 flex max-w-[92%] items-center gap-2 truncate text-xs font-semibold tracking-[0.18em] text-white/45">
              <span className="tv-breathe h-2 w-2 rounded-full bg-amber-400" />
              {def.idle}
            </span>
            <div className="absolute bottom-3.5 left-4 right-4">
              <Ticker lines={def.ticker} color={color} />
            </div>
          </>
        )}
      </div>

      {/* 工作流程圖：完整節點＋分支。待命時展示全貌；真實任務時亮出走過的路徑 */}
      <div className="mt-5">
        <p className="mb-2.5 text-[10px] font-semibold tracking-[0.2em] text-white/35">工作流程</p>
        <FlowGraph flow={def.flow} color={color} live={live} />
      </div>

      {/* 等待指示時：明確告訴觀眾在等下一步 */}
      {isWaiting && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <span className="tv-breathe h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
          <span className="text-sm text-amber-100/90">
            等待您的下一步指示 —— 請在 LINE 回覆「要」或「不要」
          </span>
        </div>
      )}
    </div>
  );
}
