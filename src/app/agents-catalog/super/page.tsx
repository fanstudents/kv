import Link from "next/link";
import { ArrowLeft, ChevronDown, UserCog, RefreshCw, Users, FlagTriangleRight } from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Mascot from "@/components/agents/Mascot";
import VisitFlowSteps, { type FlowStep } from "@/components/agents/VisitFlowSteps";
import { SUPER_AGENTS, principalAvatar } from "@/lib/super-agent-data";

export const metadata = { title: "超級 Agent｜Agent 目錄" };

const SERVICE_MODEL: FlowStep[] = [
  { key: "kickoff", label: "主理人帶隊啟動", detail: "Month 1", icon: UserCog, state: "done" },
  { key: "coach", label: "每週覆盤・調教", detail: "Month 1–3", icon: RefreshCw, state: "done" },
  { key: "handoff", label: "轉交內部主管", detail: "可提前啟動", icon: Users, state: "done" },
  { key: "lead", label: "主管獨立領軍", detail: "3 個月後", icon: FlagTriangleRight, state: "active" },
];

export default function SuperAgentCatalogPage() {
  return (
    <div>
      <Link
        href="/agents-catalog"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> Agent 目錄總覽
      </Link>
      <p className="text-xs font-bold tracking-[0.2em] text-amber-600 dark:text-amber-400">超級 AGENT・業界獨家</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white sm:text-3xl">
        一整組 Agent Team，由真人主理人帶隊。
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        超級 Agent 不只是軟體，是把「真人專業經理人」編進服務模式：主理人把多年方法論寫進 Agent 團隊，
        每週看數據覆盤、逐項調教。你聘到的是一位到任即戰的主理人，帶著他的團隊直接加入你的陣容。
      </p>

      {/* 服務模式：3 個月真人帶隊，之後可轉交企業內部主管 */}
      <Card className="mt-8 border-t-2 border-t-amber-500">
        <p className="text-[10px] font-bold tracking-[0.24em] text-neutral-400">服務模式・怎麼運作</p>
        <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">
          前 3 個月真人主理人帶隊，之後可以轉交給你公司內部主管。
        </h2>
        <div className="mt-6 overflow-x-auto pb-1">
          <div className="min-w-[520px]">
            <VisitFlowSteps steps={SERVICE_MODEL} />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-neutral-100 pt-5 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300 sm:grid-cols-2">
          <p>
            <b className="text-neutral-900 dark:text-white">前 3 個月：</b>
            主理人親自設計團隊分工、把操盤方法論寫進 Agent，每週覆盤數據並直接調整策略——這段期間你看到的是
            主理人在第一線帶隊。
          </p>
          <p>
            <b className="text-neutral-900 dark:text-white">轉交：</b>
            不強制滿 3 個月才能移交。只要你公司內部有適合的主管，隨時可以安排並肩學習、提前接手，
            主理人退居顧問角色，視需要支援。
          </p>
        </div>
      </Card>

      {/* 5 組超級 Agent */}
      <div className="mt-10 space-y-4">
        {SUPER_AGENTS.map((sa) => (
          <details
            key={sa.id}
            className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <summary className="flex cursor-pointer list-none items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={principalAvatar(sa)}
                alt={sa.principal?.name ?? sa.shortTitle}
                className="h-12 w-12 shrink-0 rounded-full border border-neutral-200 object-cover object-top dark:border-neutral-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-neutral-900 dark:text-white">{sa.title}</p>
                  {sa.status === "active" ? (
                    <Badge tone="success">運作中</Badge>
                  ) : (
                    <Badge tone="warning">主理人遴選中</Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-400">
                  {sa.code} · 主理人 {sa.principal?.name ?? "遴選中"}
                </p>
              </div>
              <ChevronDown size={18} className="shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>

            <div className="border-t border-neutral-100 px-4 pb-5 pt-4 dark:border-neutral-800">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{sa.desc}</p>

              <dl className="mt-4 grid gap-2 sm:grid-cols-3">
                {sa.dossier.map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <dt className="font-bold text-neutral-400">{k}</dt>
                    <dd className="mt-0.5 text-neutral-600 dark:text-neutral-300">{v}</dd>
                  </div>
                ))}
              </dl>

              <p className="mb-2 mt-5 text-[11px] font-semibold tracking-wide text-neutral-400">團隊編制</p>
              <div className="flex flex-wrap items-center gap-3">
                {sa.team.map((m) => (
                  <div key={m.name} className="flex items-center gap-1.5 rounded-full border border-neutral-100 py-1 pl-1 pr-3 dark:border-neutral-800">
                    <Mascot species={m.species} color={m.color} prop={m.prop} size={28} />
                    <span className="text-xs text-neutral-600 dark:text-neutral-300">{m.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
                <span className="text-neutral-400">超級 Agent・名額制</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">NT$30,000／月起・專案報價</span>
              </div>
            </div>
          </details>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-neutral-400">
        只需要單一職務，不需要整組帶隊？看看{" "}
        <Link href="/agents-catalog/professional" className="font-medium text-[#06C755]">
          專業型 Agent
        </Link>
        。
      </p>
    </div>
  );
}
