"use client";

import { useEffect, useState } from "react";
import BrandLogo from "@/components/integrations/BrandLogo";
import { INTEGRATION_SEEDS } from "@/lib/integrations-data";
import type { IntegrationStatusMap } from "@/lib/integration-status";
import type { AgentSlug } from "@/lib/types";

// 「Agent 設定」裡的串接狀態：這位 Agent 實際接了哪些外部服務、連的是哪個帳號／
// 資源、還連不連得上——一律以 /api/integrations/status 即時查到的結果為準，
// 不是 INTEGRATION_SEEDS 手動標記的種子狀態（改個環境變數、金鑰過期，那份資料
// 不會自己更新）。跟 RealStatusPanel 分開放：那邊管的是示範／真實數據切換，
// 這裡永遠顯示，不受示範模式影響——可能有多個帳號時，這是唯一能一眼看到
// 「目前接的是哪一組」的地方。
export default function ConnectionStatusList({ slug }: { slug: AgentSlug }) {
  const [live, setLive] = useState<IntegrationStatusMap | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/integrations/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setLive(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const services = INTEGRATION_SEEDS.filter((s) => s.uses.some((u) => u.agent === slug));
  if (services.length === 0) return null;

  return (
    <div className="mb-5 border-b border-neutral-100 pb-5 dark:border-neutral-800">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.15em] text-neutral-400">串接狀態</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {services.map((s) => {
          const status = live?.[s.id];
          const connected = status?.connected ?? s.status === "connected";
          return (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/60"
            >
              <BrandLogo brand={s.icon} name={s.name} color={s.color} size={20} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-neutral-700 dark:text-neutral-200">{s.name}</span>
                {status?.detail && (
                  <span className="block truncate text-[10px] text-neutral-400">{status.detail}</span>
                )}
              </span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  connected ? "bg-[#06C755]/12 text-[#06C755]" : "bg-amber-400/12 text-amber-500"
                }`}
              >
                {live === null ? "查詢中…" : connected ? "已連線" : "待連線"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
