"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Mail, Plug, Star } from "lucide-react";
import { AGENTS } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

/** 抓某位 Agent 待命場景的真實資料；失敗回 null（前端退回示意資料） */
function useIdleData<T>(agent: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/tv/idle?agent=${agent}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok && d.data) setData(d.data as T);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [agent]);
  return data;
}

// 待命場景：每位 Agent 待命時「桌上擺的東西」都不一樣——
// 成效分析擺著標好重點的報表、行程助理攤開未來七天的行事曆、約拜訪等著名片……
// 讓每一位看起來都像真的坐在位子上工作，而不是同一張空白取景框。

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function Chip({ tone, children }: { tone: "ok" | "warn" | "dim"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-[#06C755]/12 text-[#06C755]"
      : tone === "warn"
        ? "bg-amber-400/12 text-amber-300"
        : "bg-white/[0.08] text-white/45";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-md rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      {children}
    </div>
  );
}

/* Vivian 總管：晨報整備中（接真實 24 小時團隊動態，取不到退回示意） */
interface TeamleadData {
  total: number;
  failed: number;
  top: { slug: string; count: number }[];
}
function TeamleadScene({ color }: { color: string }) {
  const real = useIdleData<TeamleadData>("teamlead");
  const nameOf = (slug: string) => {
    const a = AGENTS.find((x) => x.slug === slug);
    return a ? `${a.personEn} · ${a.shortName}` : slug;
  };
  const items =
    real && real.top.length > 0
      ? real.top.map((t) => ({ label: nameOf(t.slug), meta: `24 小時 ${t.count} 項`, done: true }))
      : [
          { label: "廣告成效", meta: "已彙整", done: true },
          { label: "客服進線", meta: "已彙整", done: true },
          { label: "訂單出貨", meta: "彙整中…", done: false },
        ];
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-white/85">今日晨報整備</p>
        <Chip tone="dim">明早 09:00 送出</Chip>
      </div>
      {real && (
        <p className="mb-2.5 text-xs text-white/50">
          過去 24 小時全隊共 <span style={{ color }}>{real.total}</span> 項動態
          {real.failed > 0 && <span className="text-amber-300">，{real.failed} 項異常已列入晨報</span>}
        </p>
      )}
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2.5 text-sm">
            {it.done ? (
              <CheckCircle2 size={15} style={{ color }} />
            ) : (
              <span className="flex w-[15px] items-center justify-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <i
                    key={i}
                    className="office-typing h-1 w-1 rounded-full bg-white/60"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </span>
            )}
            <span className={it.done ? "text-white/70" : "text-white/90"}>
              {it.label}
              <span className="ml-2 text-xs text-white/35">{it.meta}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* Kevin 監控：指標儀表 */
function NotifyScene({ color }: { color: string }) {
  const rows = [
    { label: "問卷完成率", value: "68%", pct: 68, threshold: 70, warn: true },
    { label: "付款逾時", value: "0 筆", pct: 6, threshold: 40, warn: false },
    { label: "廣告 CPA", value: "+8%", pct: 46, threshold: 80, warn: false },
  ];
  return (
    <Panel>
      <p className="mb-3 text-sm font-medium text-white/85">即時監控 · 6 項指標</p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/60">{r.label}</span>
              <span className={r.warn ? "font-medium text-amber-300" : "text-white/75"}>{r.value}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${r.warn ? "tv-breathe" : ""}`}
                style={{ width: `${r.pct}%`, background: r.warn ? "#F59E0B" : color }}
              />
              <span
                className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-white/35"
                style={{ left: `${r.threshold}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* Ivy 成效分析：標好重點的報表 */
function ReportScene({ color }: { color: string }) {
  const rows = [
    { ch: "Meta", spend: "32.4K", conv: "214", roas: "3.6", hot: true },
    { ch: "Google", spend: "28.1K", conv: "166", roas: "3.2", hot: false },
    { ch: "LINE", spend: "12.0K", conv: "58", roas: "2.8", hot: false },
  ];
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-white/85">本週成效總表</p>
        <Chip tone="ok">週 ROAS 3.4 ↑</Chip>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/8">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/[0.05] text-white/45">
              <th className="px-3 py-1.5 text-left font-medium">渠道</th>
              <th className="px-3 py-1.5 text-right font-medium">花費</th>
              <th className="px-3 py-1.5 text-right font-medium">轉換</th>
              <th className="px-3 py-1.5 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.ch}
                className={r.hot ? "tv-breathe" : ""}
                style={r.hot ? { background: `${color}14` } : undefined}
              >
                <td className="px-3 py-2 text-white/80">{r.ch}</td>
                <td className="px-3 py-2 text-right text-white/60">{r.spend}</td>
                <td className="px-3 py-2 text-right text-white/60">{r.conv}</td>
                <td className="px-3 py-2 text-right font-medium" style={r.hot ? { color } : undefined}>
                  <span className={r.hot ? "" : "text-white/75"}>{r.roas}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/45">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        重點：Meta 表現最佳；週三轉換低谷原因已標注在報表內
      </p>
    </Panel>
  );
}

/* Milo 行程：未來七天行事曆 + 注意事項（接真實 Google 行事曆，取不到退回示意） */
interface ScheduleData {
  dayCounts: number[];
  upcoming: { label: string; title: string }[];
  warnings: string[];
}
function ScheduleScene({ color }: { color: string }) {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    const kick = requestAnimationFrame(() => setToday(new Date()));
    return () => cancelAnimationFrame(kick);
  }, []);
  const real = useIdleData<ScheduleData>("schedule");
  const eventDots = real?.dayCounts ?? [2, 1, 0, 3, 1, 0, 1];
  const realNotes = real
    ? [
        ...real.upcoming.slice(0, 2).map((u) => ({ text: `${u.label} ${u.title}`, warn: false })),
        ...real.warnings.map((w) => ({ text: w, warn: true })),
      ].slice(0, 3)
    : null;
  const notes = realNotes
    ? realNotes.length > 0
      ? realNotes
      : [{ text: "接下來七天行程淨空，適合安排拜訪", warn: false }]
    : [
        { text: "週五 14:00 王小明 諮詢（已確認）", warn: false },
        { text: "下週二 兩場會議僅相隔 15 分", warn: true },
        { text: "週日 訂閱續約日，前一天提醒", warn: false },
      ];
  return (
    <Panel>
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white/85">
        <CalendarDays size={14} style={{ color }} /> 未來七天
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = today ? new Date(today.getTime() + i * 86400000) : null;
          const isToday = i === 0;
          return (
            <div
              key={i}
              className={`rounded-lg border px-1 py-1.5 text-center ${isToday ? "tv-breathe" : ""}`}
              style={{
                borderColor: isToday ? `${color}66` : "rgba(255,255,255,0.08)",
                background: isToday ? `${color}14` : "rgba(255,255,255,0.02)",
              }}
            >
              <p className="text-[9px] text-white/40">{d ? `週${WEEKDAYS[d.getDay()]}` : "—"}</p>
              <p className={`text-xs ${isToday ? "font-semibold text-white" : "text-white/70"}`}>
                {d ? d.getDate() : "–"}
              </p>
              <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                {Array.from({ length: Math.min(eventDots[i], 3) }).map((_, j) => (
                  <span key={j} className="h-1 w-1 rounded-full" style={{ background: color }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ul className="mt-3 space-y-1.5">
        {notes.map((n) => (
          <li key={n.text} className="flex items-start gap-1.5 text-[11px] leading-snug">
            <span
              className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${n.warn ? "bg-amber-400" : ""}`}
              style={n.warn ? undefined : { background: color }}
            />
            <span className={n.warn ? "text-amber-200/90" : "text-white/55"}>{n.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* Sunny 社群：排程佇列 */
function CardScene({ color }: { color: string }) {
  const posts = [
    { time: "明日 12:00", title: "新品開箱貼文", note: "3 版草稿待挑選", hot: true },
    { time: "週四 18:00", title: "客戶見證分享", note: "已定稿", hot: false },
    { time: "週六 10:00", title: "幕後花絮", note: "撰寫中", hot: false },
  ];
  return (
    <Panel>
      <p className="mb-3 text-sm font-medium text-white/85">發文排程佇列</p>
      <ul className="space-y-2">
        {posts.map((p) => (
          <li
            key={p.title}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${p.hot ? "tv-breathe" : ""}`}
            style={{
              borderColor: p.hot ? `${color}55` : "rgba(255,255,255,0.08)",
              background: p.hot ? `${color}10` : "rgba(255,255,255,0.02)",
            }}
          >
            <span className="w-16 shrink-0 text-[10px] text-white/40">{p.time}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-white/80">
              {p.title}
              {p.hot && <span className="office-blink ml-0.5" style={{ color }}>▍</span>}
            </span>
            <Chip tone={p.hot ? "warn" : "dim"}>{p.note}</Chip>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* Leo SEO：排名看板 */
function ExpenseScene({ color }: { color: string }) {
  const rows = [
    { kw: "AI 名片管理", rank: 4, delta: "▲2", up: true, hot: true },
    { kw: "LINE 行銷工具", rank: 7, delta: "▲1", up: true, hot: false },
    { kw: "客戶關係 CRM", rank: 12, delta: "▼3", up: false, hot: false },
  ];
  return (
    <Panel>
      <p className="mb-3 text-sm font-medium text-white/85">關鍵字排名追蹤</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.kw}
            className={`flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 ${r.hot ? "tv-breathe" : ""}`}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold"
              style={{ background: `${color}1a`, color }}
            >
              {r.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-white/80">{r.kw}</span>
            <span className={`text-xs font-medium ${r.up ? "text-[#06C755]" : "text-amber-300"}`}>{r.delta}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11px] text-white/40">每日 06:00 快照 · 3 組進前十</p>
    </Panel>
  );
}

/* Coco 約拜訪：名片取景框（等待上傳）＋真實可用標籤 */
function VisitScene({ color }: { color: string }) {
  const real = useIdleData<{ tags: string[] }>("visit");
  const tags = real?.tags?.length ? real.tags.slice(0, 6) : ["潛在客戶", "合作夥伴", "VIP", "同業"];
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="tv-breathe flex h-36 w-60 items-center justify-center rounded-xl border-2 border-dashed sm:h-44 sm:w-72"
        style={{ borderColor: `${color}55` }}
      >
        <div className="text-center">
          <span className="mx-auto block h-2.5 w-2.5 rounded-full" style={{ background: `${color}aa` }} />
          <p className="mt-2 text-[11px] text-white/40">LINE 傳名片照片給我</p>
        </div>
      </div>
      <div className="flex max-w-md flex-wrap items-center justify-center gap-1.5">
        {tags.map((t) => (
          <span key={t} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/45">
            {t}
          </span>
        ))}
        <span className="text-[10px] text-white/30">← 辨識後可一鍵標註</span>
      </div>
    </div>
  );
}

/* Dana 廣告投手：投放看板 */
function TodayScene({ color }: { color: string }) {
  const rows = [
    { ch: "Meta", spend: "6,820", roas: "3.2", cpa: 132, hot: false },
    { ch: "Google", spend: "5,140", roas: "2.9", cpa: 165, hot: true },
  ];
  const threshold = 180;
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-white/85">今日投放看板</p>
        <Chip tone="dim">下次抓取 明早 06:30</Chip>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.ch} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-white/80">{r.ch}</span>
              <span className="text-white/50">
                花費 {r.spend} · ROAS <span style={{ color }}>{r.roas}</span>
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full ${r.hot ? "tv-breathe" : ""}`}
                style={{ width: `${(r.cpa / 220) * 100}%`, background: r.hot ? "#F59E0B" : color }}
              />
              <span
                className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-white/35"
                style={{ left: `${(threshold / 220) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-white/35">
              CPA NT${r.cpa} / 門檻 NT${threshold}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* Jay 口碑：評論流 */
function CompetitorScene({ color }: { color: string }) {
  return (
    <Panel>
      <p className="mb-3 text-sm font-medium text-white/85">評論監看</p>
      <div className="space-y-2">
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={11} className="fill-current" style={{ color }} />
            ))}
            <span className="ml-1.5 text-[10px] text-white/35">2 小時前</span>
          </div>
          <p className="text-xs leading-relaxed text-white/70">「服務很專業，回覆速度超快，會再回購！」</p>
        </div>
        <div className="tv-breathe rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1">
            {[0, 1].map((i) => (
              <Star key={i} size={11} className="fill-current text-amber-300" />
            ))}
            {[0, 1, 2].map((i) => (
              <Star key={i} size={11} className="text-white/20" />
            ))}
            <span className="ml-1.5 flex items-center gap-1 text-[10px] text-amber-300">
              <AlertTriangle size={10} /> 已通報＋附建議回覆
            </span>
          </div>
          <p className="text-xs leading-relaxed text-white/70">「等了很久都沒有人回覆我…」</p>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-white/40">本週聲量 +8% · 競品動態監看中</p>
    </Panel>
  );
}

/* Morgan 營運：儀表板方塊 */
function OperationsScene({ color }: { color: string }) {
  const tiles = [
    { label: "庫存", value: "正常", warn: false },
    { label: "出貨", value: "正常", warn: false },
    { label: "知識庫", value: "+6 條", warn: false },
    { label: "流程卡點", value: "1 件", warn: true },
  ];
  return (
    <Panel>
      <p className="mb-3 text-sm font-medium text-white/85">營運儀表板</p>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`rounded-lg border px-3 py-2.5 ${t.warn ? "tv-breathe border-amber-400/25 bg-amber-400/[0.06]" : "border-white/8 bg-white/[0.02]"}`}
          >
            <p className="text-[10px] text-white/40">{t.label}</p>
            <p className={`mt-0.5 text-sm font-medium ${t.warn ? "text-amber-300" : ""}`} style={t.warn ? undefined : { color }}>
              {t.value}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* Amber 客服：等待金鑰接入 */
function SupportScene({ color }: { color: string }) {
  return (
    <Panel className="text-center">
      <Plug size={26} className="mx-auto mb-3 text-amber-300/80" />
      <p className="text-sm text-white/80">等待客服官方帳號金鑰接入</p>
      <p className="mt-1 text-[11px] text-white/40">接上後即可 24 小時值班回覆進線</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <Chip tone="ok">話術庫 就緒</Chip>
        <Chip tone="warn">待接帳號 ×1</Chip>
      </div>
      <div className="mx-auto mt-4 flex w-14 items-center justify-center gap-1 rounded-lg rounded-tl-sm bg-white/[0.06] px-2.5 py-2">
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className="office-typing h-1.5 w-1.5 rounded-full"
            style={{ background: `${color}aa`, animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </Panel>
  );
}

/* Ray 訂單：等待 Webhook */
function OrdersScene({ color }: { color: string }) {
  return (
    <Panel>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-white/85">訂單值班台</p>
        <Chip tone="warn">
          <Plug size={10} /> 等待 Webhook 接通
        </Chip>
      </div>
      <ul className="space-y-2 opacity-45">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
            <Mail size={13} className="shrink-0 text-white/30" />
            <span className="h-1.5 flex-1 rounded bg-white/10" style={{ width: `${70 - i * 12}%` }} />
            <span className="h-4 w-12 rounded-full bg-white/[0.07]" />
          </li>
        ))}
      </ul>
      <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/40">
        <CheckCircle2 size={12} style={{ color }} /> 出貨／到貨／逾期通知模板已備好
      </p>
    </Panel>
  );
}

export default function IdleScene({ slug, color }: { slug: AgentSlug; color: string }) {
  switch (slug) {
    case "teamlead":
      return <TeamleadScene color={color} />;
    case "notify":
      return <NotifyScene color={color} />;
    case "report":
      return <ReportScene color={color} />;
    case "schedule":
      return <ScheduleScene color={color} />;
    case "card":
      return <CardScene color={color} />;
    case "expense":
      return <ExpenseScene color={color} />;
    case "visit":
      return <VisitScene color={color} />;
    case "today":
      return <TodayScene color={color} />;
    case "competitor":
      return <CompetitorScene color={color} />;
    case "operations":
      return <OperationsScene color={color} />;
    case "support":
      return <SupportScene color={color} />;
    case "orders":
      return <OrdersScene color={color} />;
    default:
      return null;
  }
}
