"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import TrendChart from "@/components/agents/charts/TrendChart";
import type { CanvasPayload } from "@/lib/chat-canvas";

// 指揮台的畫布面板:Agent 回覆帶了真實圖表資料時,畫在畫面右側,像 Gemini Canvas
// 那樣跟對話分開呈現,而不是塞在聊天泡泡裡的一段文字。深色配色跟劇場模式一致。

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
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (it.value / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ConsoleCanvas({ canvas, onClose }: { canvas: CanvasPayload; onClose: () => void }) {
  const color = canvas.kind === "ga4-trend" ? "#3B82F6" : "#14B8A6";

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12]/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <p className="text-sm font-semibold text-white">{canvas.title}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="關閉畫布"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {canvas.kind === "ga4-trend" ? (
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
        ) : (
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
      </div>
    </div>
  );
}
