import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Mascot from "@/components/agents/Mascot";
import { SUPER_AGENTS, principalAvatar } from "@/lib/super-agent-data";

function PrincipalFace({ sa, size = 48 }: { sa: (typeof SUPER_AGENTS)[number]; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={principalAvatar(sa)}
      alt={sa.principal?.name ?? sa.shortTitle}
      className="shrink-0 rounded-full border border-neutral-200 object-cover object-top dark:border-neutral-700"
      style={{ width: size, height: size }}
    />
  );
}

export default function SuperAgentsPage() {
  return (
    <div>
      <PageHeader
        title="超級 Agent"
        description={`${SUPER_AGENTS.length} 組由真人主理人帶隊的 Agent Team——依企業條件客製、獨立部署於各自環境，點擊查看團隊編制、覆盤與任務紀錄`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SUPER_AGENTS.map((sa) => (
          <Link key={sa.id} href={`/super-agents/${sa.id}`}>
            <Card className="h-full border-t-2 border-t-neutral-900 transition-shadow hover:shadow-md dark:border-t-neutral-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-neutral-400">{sa.code}</p>
                  <p className="mt-1 font-semibold text-neutral-900 dark:text-white">{sa.title}</p>
                </div>
                {sa.status === "active" ? (
                  <Badge tone="success">運作中</Badge>
                ) : (
                  <Badge tone="warning">主理人遴選中</Badge>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <PrincipalFace sa={sa} />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold tracking-[0.22em] text-neutral-400">主理人・PRINCIPAL</p>
                  <p className="truncate font-serif text-lg font-semibold text-neutral-900 dark:text-white">
                    {sa.principal?.name ?? "遴選中"}
                  </p>
                  <p className="truncate text-xs text-neutral-400">{sa.principal?.title ?? "即將公布"}</p>
                </div>
              </div>

              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{sa.desc}</p>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <div className="flex items-center">
                  {sa.team.map((m) => (
                    <span key={m.name} className="-ml-1 first:ml-0">
                      <Mascot species={m.species} color={m.color} prop={m.prop} size={26} />
                    </span>
                  ))}
                  <span className="ml-2 text-xs text-neutral-400">{sa.team.length} 位 Agent</span>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-[#06C755]">
                  查看團隊 <ArrowRight size={12} />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
