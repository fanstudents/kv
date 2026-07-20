import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Mascot from "@/components/agents/Mascot";
import { SUPER_AGENTS, getSuperAgent, principalAvatar } from "@/lib/super-agent-data";

export function generateStaticParams() {
  return SUPER_AGENTS.map((sa) => ({ id: sa.id }));
}

export default async function SuperAgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sa = getSuperAgent(id);
  if (!sa) notFound();

  return (
    <div>
      <Link
        href="/super-agents"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> 超級 Agent 總覽
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {sa.title}
            {sa.status === "active" ? <Badge tone="success">運作中</Badge> : <Badge tone="warning">主理人遴選中</Badge>}
          </span>
        }
        description={sa.desc}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* 左：主理人檔案＋團隊編制 */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-t-2 border-t-neutral-900 dark:border-t-neutral-100">
            <p className="text-[10px] font-bold tracking-[0.24em] text-neutral-400">主理人・PRINCIPAL</p>
            <div className="mt-4 flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={principalAvatar(sa)}
                alt={sa.principal?.name ?? sa.shortTitle}
                className="h-[106px] w-[88px] shrink-0 rounded border border-neutral-200 bg-[#EDE7DC] object-cover object-top dark:border-neutral-700"
              />
              <div className="min-w-0">
                <p className="font-serif text-2xl font-semibold tracking-wide text-neutral-900 dark:text-white">
                  {sa.principal?.name ?? "遴選中"}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{sa.principal?.title ?? "即將公布"}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              {sa.dossier.map(([k, v]) => (
                <div key={k} className="flex gap-3 text-sm">
                  <dt className="w-9 shrink-0 pt-0.5 text-xs font-bold text-neutral-400">{k}</dt>
                  <dd className="text-neutral-600 dark:text-neutral-300">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <p className="text-[10px] font-bold tracking-[0.24em] text-neutral-400">團隊編制</p>
            <div className="mt-4 flex flex-col items-center">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                {sa.principal?.name ?? "主理人"}
              </p>
              <div className="h-3 w-0.5 bg-neutral-200 dark:bg-neutral-700" />
              <div className="relative flex w-full justify-around pt-0">
                <div
                  className="absolute top-0 h-0.5 bg-neutral-200 dark:bg-neutral-700"
                  style={{ left: `${50 / sa.team.length}%`, right: `${50 / sa.team.length}%` }}
                />
                {sa.team.map((m) => (
                  <div key={m.name} className="flex flex-col items-center gap-1">
                    <div className="h-2.5 w-0.5 bg-neutral-200 dark:bg-neutral-700" />
                    <Mascot species={m.species} color={m.color} prop={m.prop} size={38} />
                    <p className="text-[11px] font-medium text-neutral-500">{m.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* 右：KPI＋覆盤＋任務紀錄（示意） */}
        <div className="space-y-4 lg:col-span-3">
          <div className="grid grid-cols-2 gap-4">
            {sa.kpis.map((k) => (
              <Card key={k.label}>
                <p className="text-xs text-neutral-400">{k.label}</p>
                <p className="mt-1 text-xl font-semibold text-neutral-900 dark:text-white">
                  {k.value}
                  {k.delta && <span className="ml-1.5 text-xs font-medium text-[#06C755]">{k.delta}</span>}
                </p>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-neutral-900 dark:text-white">主理人覆盤紀錄</p>
              <Badge tone="neutral">示意資料</Badge>
            </div>
            <div className="mt-3 space-y-4">
              {sa.weekly.map((w) => (
                <div key={w.date} className="border-l-2 border-neutral-200 pl-4 dark:border-neutral-700">
                  <p className="text-xs font-semibold text-neutral-400">{w.date}</p>
                  <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{w.summary}</p>
                  <ul className="mt-2 space-y-1">
                    {w.decisions.map((d) => (
                      <li key={d} className="flex gap-2 text-xs text-neutral-500">
                        <span className="text-[#06C755]">✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-neutral-900 dark:text-white">團隊任務紀錄</p>
              <Badge tone="neutral">示意資料</Badge>
            </div>
            <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
              {sa.activity.map((a) => (
                <li key={a.timestamp + a.summary} className="flex items-start gap-3 py-2.5 text-sm">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      a.status === "success" ? "bg-[#06C755]" : "bg-amber-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-neutral-700 dark:text-neutral-200">{a.summary}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">{a.timestamp}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#06C755]">{a.agent} Agent</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
