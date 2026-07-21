"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { PropKind } from "@/lib/agent-briefings";

// 階段循環：0..steps（含全數完成的一拍）不斷輪播，像同事持續在做這件事。
// 以「經過時間」推進，計時器被節流時也能正確跳到當下該有的階段。
function useStepCycle(count: number, ms = 1150) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      setStep(Math.floor((performance.now() - start) / ms) % (count + 1));
    }, 120);
    return () => clearInterval(id);
  }, [count, ms]);
  return step;
}

/* 各職務的道具視覺（保持穩定可見，動畫凍結時仍看得到） */
function PropGraphic({ kind, color }: { kind: PropKind; color: string }) {
  if (kind === "card") {
    return (
      <div className="relative">
        {/* 取景框四角 */}
        <div className="pointer-events-none absolute -inset-4">
          {[
            "left-0 top-0 border-l-2 border-t-2",
            "right-0 top-0 border-r-2 border-t-2",
            "left-0 bottom-0 border-b-2 border-l-2",
            "right-0 bottom-0 border-b-2 border-r-2",
          ].map((pos) => (
            <span key={pos} className={`absolute h-3.5 w-3.5 ${pos}`} style={{ borderColor: color }} />
          ))}
        </div>
        {/* 名片 */}
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
      </div>
    );
  }

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
        <span className="absolute h-1 w-1 rounded-full bg-white/70" style={{ top: "60%", left: "40%" }} />
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

export default function LiveTask({
  prop,
  steps,
  color,
}: {
  prop: PropKind;
  steps: string[];
  color: string;
}) {
  const step = useStepCycle(steps.length);

  return (
    <div>
      {/* 場景螢幕 */}
      <div className="relative h-40 overflow-hidden rounded-2xl border border-white/10 bg-[#06090d]">
        {/* 細格線 */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* 掃描線 */}
        <div
          className="live-scan absolute inset-x-0 top-0 h-12"
          style={{ background: `linear-gradient(180deg, transparent, ${color}22 60%, ${color}44)` }}
        />
        {/* 道具 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <PropGraphic kind={prop} color={color} />
        </div>
        {/* LIVE 標記 */}
        <span className="absolute left-3 top-3 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-white/45">
          <span className="tv-breathe h-1.5 w-1.5 rounded-full" style={{ background: color }} />
          LIVE · 現正處理
        </span>
      </div>

      {/* 階段流水線：辨識中 → 寫入中 → 比對中 → 邀約中 */}
      <div className="mt-3.5 flex items-center gap-1.5">
        {steps.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex flex-1 items-center gap-1.5">
              {i > 0 && (
                <span
                  className="h-px flex-1 rounded"
                  style={{ background: i <= step ? color : "rgba(255,255,255,0.12)" }}
                />
              )}
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active ? "tv-breathe" : ""
                }`}
                style={{
                  borderColor: done || active ? color : "rgba(255,255,255,0.2)",
                  background: done ? color : active ? `${color}33` : "transparent",
                }}
              >
                {done && <Check size={10} className="text-[#05060a]" strokeWidth={3} />}
                {active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
              </span>
              <span
                className={`whitespace-nowrap text-xs ${
                  active ? "font-medium" : done ? "text-white/55" : "text-white/30"
                }`}
                style={active ? { color } : undefined}
              >
                {active ? `${label}中…` : label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
