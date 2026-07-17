"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, AlertTriangle, Table2, Settings, MessageCircle } from "lucide-react";
import { AGENTS } from "@/lib/agent-data";
import Avatar from "@/components/agents/Avatar";

interface ActivityRow {
  agent_slug: string | null;
  occurred_at: string;
  status: "success" | "failed" | "pending";
}

export default function Sidebar() {
  const pathname = usePathname();
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = () =>
      fetch("/api/activity?status=success&limit=500")
        .then((res) => (res.ok ? res.json() : []))
        .then((rows: ActivityRow[]) => {
          if (!Array.isArray(rows)) return;
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          const counts: Record<string, number> = {};
          for (const row of rows) {
            if (!row.agent_slug) continue;
            if (new Date(row.occurred_at).getTime() < cutoff) continue;
            counts[row.agent_slug] = (counts[row.agent_slug] ?? 0) + 1;
          }
          setDayCounts(counts);
        })
        .catch(() => {});

    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-5 dark:border-neutral-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C755] text-white">
          <MessageCircle size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">LINE Agent 控制台</p>
          <p className="text-xs text-neutral-400">tbr.digital</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <Link
          href="/"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <LayoutDashboard size={18} />
          團隊總覽
        </Link>

        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-neutral-400">團隊成員</p>
        {AGENTS.map((agent) => {
          const href = `/agents/${agent.slug}`;
          return (
            <Link
              key={agent.slug}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-[#06C755]/10 text-[#06C755]"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <Avatar personEn={agent.personEn} color={agent.color} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{agent.name}</span>
                <span className="block truncate text-xs font-normal text-neutral-400">
                  {agent.personEn} {agent.personZh} · {agent.role}
                </span>
              </span>
              {(dayCounts[agent.slug] ?? 0) > 0 && (
                <span
                  className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#06C755]/15 px-1.5 text-[10px] font-bold text-[#06C755]"
                  title="最近 24 小時完成任務數"
                >
                  {dayCounts[agent.slug]}
                </span>
              )}
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  agent.status === "active"
                    ? "animate-pulse bg-[#06C755]"
                    : agent.status === "paused"
                      ? "bg-amber-500"
                      : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              />
            </Link>
          );
        })}

        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-neutral-400">系統</p>
        <Link
          href="/outputs"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/outputs")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <Table2 size={18} />
          產出總覽
        </Link>
        <Link
          href="/anomalies"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/anomalies")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <AlertTriangle size={18} />
          異常儀表板
        </Link>
        <Link
          href="/todos"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/todos")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <ListChecks size={18} />
          待辦總覽
        </Link>
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/settings")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <Settings size={18} />
          LINE OA 連線設定
        </Link>
      </nav>

      <div className="border-t border-neutral-200 px-5 py-4 text-xs text-neutral-400 dark:border-neutral-800">
        service@tbr.digital
      </div>
    </aside>
  );
}
