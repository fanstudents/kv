"use client";

import { AlertTriangle, ArrowDown, ArrowUp, CalendarClock, CheckCircle2, X } from "lucide-react";
import TrendChart from "@/components/agents/charts/TrendChart";
import type { CanvasPayload } from "@/lib/chat-canvas";

// 指揮台的畫布面板:Agent 回覆帶了真實圖表、行事曆或行動方案時,畫在畫面右側,
// 像 Gemini Canvas 那樣跟對話分開呈現,而不是塞在聊天泡泡裡的一段文字。
// 深色配色跟劇場模式一致;每次開啟(掛載)都用 tv-fade 滑入,不是死板地直接出現。

const KIND_COLOR: Record<CanvasPayload["kind"], string> = {
  "ga4-trend": "#3B82F6",
  "gsc-trend": "#14B8A6",
  calendar: "#8B5CF6",
  "action-plan": "#06C755",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function StatBlock({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const up = hasDelta && (delta as number) > 0;
  return (
    <div className="rounded-xl bg-white/[0.05] px-3 py-2.5">
      <p className="text-[11px] text-white/40">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <p className="text-lg font-semibold text-white">{value}</p>
        {hasDelta && (
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${up ? "text-[#06C755]" : "text-red-400"}`}>
            {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(delta as number).toLocaleString("en-US")}
          </span>
        )}
      </div>
    </div>
  );
}

function BarList({ items, color }: { items: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-white/70">{it.label}</span>
            <span className="shrink-0 font-medium text-white">{it.value.toLocaleString("en-US")}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="tv-fade h-full rounded-full"
              style={{ width: `${Math.max(4, (it.value / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ConsoleCanvas({ canvas, onClose }: { canvas: CanvasPayload; onClose: () => void }) {
  const color = KIND_COLOR[canvas.kind];

  return (
    <div className="tv-fade flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12]/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <p className="text-sm font-semibold text-white">{canvas.title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white hover:rotate-90"
          style={{ transitionProperty: "background-color, color, transform" }}
          aria-label="關閉畫布"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {canvas.kind === "ga4-trend" && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <StatBlock label="工作階段" value={canvas.sessions.toLocaleString("en-US")} delta={canvas.sessionsDelta} />
              <StatBlock label="使用者" value={canvas.activeUsers.toLocaleString("en-US")} />
              <StatBlock label="轉換數" value={canvas.conversions.toLocaleString("en-US")} />
            </div>
            <p className="mb-2 text-xs font-medium text-white/50">每日工作階段趨勢</p>
            <TrendChart
              data={canvas.trend}
              xKey="date"
              series={[{ key: "sessions", name: "工作階段", color }]}
              forceDark
              height={180}
            />
            {canvas.channels.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-white/50">渠道拆分</p>
                <BarList items={canvas.channels} color={color} />
              </div>
            )}
          </>
        )}

        {canvas.kind === "gsc-trend" && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <StatBlock label="總點擊次數" value={canvas.totalClicks.toLocaleString("en-US")} delta={canvas.clicksDelta} />
              <StatBlock label="總曝光次數" value={canvas.totalImpressions.toLocaleString("en-US")} />
              <StatBlock label="平均 CTR" value={`${(canvas.avgCtr * 100).toFixed(1)}%`} />
              <StatBlock label="平均排名" value={canvas.avgPosition.toFixed(1)} />
            </div>
            <p className="mb-2 text-xs font-medium text-white/50">每日點擊趨勢</p>
            <TrendChart
              data={canvas.trend}
              xKey="date"
              series={[{ key: "clicks", name: "點擊", color }]}
              forceDark
              height={180}
            />
            {canvas.topQueries.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-white/50">熱門關鍵字</p>
                <BarList items={canvas.topQueries} color={color} />
              </div>
            )}
          </>
        )}

        {canvas.kind === "calendar" && (
          <>
            <div className="mb-5 grid grid-cols-7 gap-1.5">
              {canvas.dayCounts.map((count, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const max = Math.max(1, ...canvas.dayCounts);
                return (
                  <div
                    key={i}
                    className="tv-fade flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] py-2.5"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <p className="text-[10px] text-white/35">{i === 0 ? "今天" : `週${WEEKDAYS[d.getDay()]}`}</p>
                    <p className="font-mono text-base font-light" style={{ color: count > 0 ? color : "rgba(255,255,255,0.3)" }}>
                      {count}
                    </p>
                    <div className="h-1 w-4 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(8, (count / max) * 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {canvas.warnings.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {canvas.warnings.map((w, i) => (
                  <p key={i} className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-300">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
            )}

            {canvas.upcoming.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-white/50">接下來的行程</p>
                <ul className="space-y-2">
                  {canvas.upcoming.map((u, i) => (
                    <li
                      key={i}
                      className="tv-fade flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-xs"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <CalendarClock size={13} className="shrink-0" style={{ color }} />
                      <span className="min-w-0 flex-1 truncate text-white/80">{u.title}</span>
                      <span className="shrink-0 text-white/35">{u.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-white/30">未來 7 天沒有排定的行程。</p>
            )}
          </>
        )}

        {canvas.kind === "action-plan" && (
          <ul className="space-y-2.5">
            {canvas.items.map((item, i) => (
              <li
                key={i}
                className="tv-fade flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{ background: `${color}22`, color }}
                >
                  <CheckCircle2 size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/90">{item.label}</p>
                  {item.detail && <p className="mt-0.5 text-xs text-white/45">{item.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
