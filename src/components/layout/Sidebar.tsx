"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  Table2,
  Settings,
  MessageCircle,
  Users,
  LogOut,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import { Crown } from "lucide-react";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { SUPER_AGENTS } from "@/lib/super-agent-data";
import Avatar from "@/components/agents/Avatar";
import type { AgentMeta } from "@/lib/types";

interface ActivityRow {
  agent_slug: string | null;
  occurred_at: string;
  status: "success" | "failed" | "pending";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  // 換頁時自動收起行動版抽屜
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const renderAgent = (agent: AgentMeta) => {
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
  };

  return (
    <>
      {/* 行動版頂欄（含漢堡） */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755] text-white">
            <MessageCircle size={16} />
          </div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">LINE Agent 控制台</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} aria-label="開啟選單" className="p-1 text-neutral-600 dark:text-neutral-300">
          <Menu size={22} />
        </button>
      </header>

      {/* 行動版遮罩 */}
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white transition-transform duration-300 dark:border-neutral-800 dark:bg-neutral-900 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-5 py-5 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C755] text-white">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">LINE Agent 控制台</p>
              <p className="text-xs text-neutral-400">tbr.digital</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="關閉選單" className="p-1 text-neutral-400 lg:hidden">
            <X size={20} />
          </button>
        </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/dashboard")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <LayoutDashboard size={18} />
          團隊總覽
        </Link>

        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-neutral-400">超級 Agent</p>
        {SUPER_AGENTS.map((sa) => {
          const href = `/super-agents/${sa.id}`;
          return (
            <Link
              key={sa.id}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-[#06C755]/10 text-[#06C755]"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Crown size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{sa.shortTitle}超級 Agent</span>
                <span className="block truncate text-xs font-normal text-neutral-400">
                  {sa.principal ? `主理人 ${sa.principal.name}` : "主理人遴選中"}
                </span>
              </span>
              {sa.status === "active" && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#06C755]" />}
            </Link>
          );
        })}

        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-neutral-400">行銷 Team</p>
        {AGENTS.filter((a) => agentTeam(a.slug) === "marketing").map(renderAgent)}

        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-neutral-400">行政 Team</p>
        {AGENTS.filter((a) => agentTeam(a.slug) === "admin").map(renderAgent)}

        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-neutral-400">系統</p>
        <Link
          href="/subscribers"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/subscribers")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <Users size={18} />
          訂閱者管理
        </Link>
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
          href="/ai-usage"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive("/ai-usage")
              ? "bg-[#06C755]/10 text-[#06C755]"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          <Wallet size={18} />
          AI 成本
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

      <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 text-xs text-neutral-400 dark:border-neutral-800">
        <span>service@tbr.digital</span>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
            router.replace("/login");
            router.refresh();
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          title="登出"
        >
          <LogOut size={13} />
          登出
        </button>
      </div>
      </aside>
    </>
  );
}
