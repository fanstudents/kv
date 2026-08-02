"use client";

import { useEffect, useState } from "react";
import { CircleDashed, Plug, Radio } from "lucide-react";
import BrandLogo from "@/components/integrations/BrandLogo";
import { useIntegrationStatus } from "@/components/integrations/useIntegrationStatus";
import { INTEGRATION_SEEDS } from "@/lib/integrations-data";
import { getAgent } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

// 關掉示範模式時，用這一塊取代所有示範數字：如實呈現這位 Agent 現在的狀態——
// 啟用了沒有、接上了哪些服務（哪些還沒接）、過去七天真的跑過幾次、最後一次是什麼時候。
// 沒有資料就明說沒有，不用假數字補位。

interface ActivityRow {
  id: string;
  occurred_at: string;
  summary: string;
  status: "success" | "failed" | "pending";
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.floor(h / 24)} 天前`;
}

export default function RealStatusPanel({
  slug,
  color,
  tone = "surface",
}: {
  slug: AgentSlug;
  color: string;
  /** dark＝劇院模式的深色舞台；surface＝後台卡片（跟著系統淺／深色） */
  tone?: "dark" | "surface";
}) {
  // 統計在「資料回來的當下」算好（而不是每次 render 都讀一次時鐘），
  // render 才是純函式、也不會因為重繪而數字跳動。
  const [stats, setStats] = useState<{ total: number; week: number; latest: string | null } | null>(null);
  const liveStatus = useIntegrationStatus();

  useEffect(() => {
    let alive = true;
    fetch(`/api/agents/${slug}/activity`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!alive) return;
        const rows: ActivityRow[] = Array.isArray(d) ? d : [];
        // 種子資料（「尚未啟用」「等待接上…」）不算真的跑過，濾掉才不會誤導
        const real = rows.filter((r) => !r.summary?.includes("尚未") && !r.summary?.includes("等待"));
        const now = Date.now();
        const week = real.filter((r) => now - new Date(r.occurred_at).getTime() <= 7 * 86400000).length;
        const first = real[0];
        setStats({
          total: real.length,
          week,
          latest: first ? `最後一次 ${relTime(first.occurred_at)}：${first.summary.slice(0, 28)}` : null,
        });
      })
      .catch(() => alive && setStats({ total: 0, week: 0, latest: null }));
    return () => {
      alive = false;
    };
  }, [slug]);

  const agent = getAgent(slug);
  const services = INTEGRATION_SEEDS.filter((s) => s.uses.some((u) => u.agent === slug));
  // 連線與否、連的是誰，一律以即時查到的結果為準——INTEGRATION_SEEDS 的 status 只是
  // 人手維護的種子資料，改個環境變數、金鑰過期，那份資料不會自己更新。查不到（liveStatus
  // 還沒回來）時暫時沿用種子狀態，避免畫面在載入瞬間全部閃成「待連線」。
  const liveOf = (id: string) => liveStatus?.[id];
  const isConnected = (s: (typeof services)[number]) => liveOf(s.id)?.connected ?? s.status === "connected";
  const connected = services.filter(isConnected);

  const dark = tone === "dark";
  const box = dark
    ? "rounded-xl border border-white/10 bg-white/[0.03]"
    : "rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60";
  const title = dark ? "text-white/85" : "text-neutral-800 dark:text-neutral-100";
  const muted = dark ? "text-white/40" : "text-neutral-400";
  const body = dark ? "text-white/70" : "text-neutral-600 dark:text-neutral-300";

  return (
    <div className={`w-full max-w-3xl ${box} p-4`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className={`flex items-center gap-1.5 text-sm font-medium ${title}`}>
          <Radio size={14} style={{ color }} />
          真實狀態
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            agent?.status === "active"
              ? "bg-[#06C755]/12 text-[#06C755]"
              : "bg-amber-400/12 text-amber-400"
          }`}
        >
          {agent?.status === "active" ? "已啟用" : "尚未啟用"}
        </span>
        <span className={`ml-auto text-[11px] ${muted}`}>示範模式已關閉，以下皆為實際狀態</span>
      </div>

      {/* 串接的服務 */}
      <p className={`mb-1.5 text-[11px] font-semibold tracking-[0.15em] ${muted}`}>
        資料來源 {connected.length}/{services.length} 已連線
      </p>
      {services.length === 0 ? (
        <p className={`mb-3 flex items-center gap-1.5 text-xs ${muted}`}>
          <CircleDashed size={12} />
          這位 Agent 目前沒有設定任何外部資料來源
        </p>
      ) : (
        <ul className="mb-3 grid gap-1.5 sm:grid-cols-2">
          {services.map((s) => {
            const live = liveOf(s.id);
            const ok = isConnected(s);
            const detail = live?.detail;
            return (
              <li key={s.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${dark ? "bg-white/[0.03]" : "bg-white dark:bg-neutral-950/40"}`}>
                <BrandLogo brand={s.icon} name={s.name} color={s.color} size={20} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-xs ${body}`}>{s.name}</span>
                  {detail && <span className={`block truncate text-[10px] ${muted}`}>{detail}</span>}
                </span>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    ok ? "bg-[#06C755]/12 text-[#06C755]" : "bg-white/10 text-amber-400"
                  }`}
                >
                  {liveStatus === null ? "查詢中…" : ok ? "已連線" : "待連線"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* 真實執行紀錄 */}
      <p className={`mb-1.5 text-[11px] font-semibold tracking-[0.15em] ${muted}`}>執行紀錄</p>
      {stats === null ? (
        <p className={`text-xs ${muted}`}>讀取中…</p>
      ) : stats.total === 0 ? (
        <p className={`flex items-center gap-1.5 text-xs ${muted}`}>
          <Plug size={12} />
          還沒有真正跑過的紀錄——接上資料來源、或從 LINE 觸發一次就會出現在這裡
        </p>
      ) : (
        <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-xs ${body}`}>
          <span>
            近 7 天 <span style={{ color }}>{stats.week}</span> 筆
          </span>
          <span>
            累計 <span style={{ color }}>{stats.total}</span> 筆
          </span>
          {stats.latest && <span className={muted}>{stats.latest}</span>}
        </div>
      )}
    </div>
  );
}
