import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CatalogAgentCard from "@/components/agents/CatalogAgentCard";
import { AGENT_CATALOG, DEPT_ORDER, agentsByTier } from "@/lib/agent-catalog";

export const metadata = { title: "通用型 Agent｜Agent 目錄" };

export default function GeneralCatalogPage() {
  const items = agentsByTier(1);
  return (
    <div>
      <Link
        href="/agents-catalog"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> Agent 目錄總覽
      </Link>
      <p className="text-xs font-bold tracking-[0.2em] text-neutral-400">通用型・LEVEL 1</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white sm:text-3xl">
        開箱即用，當天就能上工。
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        通用型 Agent 職務單純明確，不需要客製串接，部署完當天就能開始執行。點開每一張卡片看實際的運作流程——
        它接什麼、判斷什麼、最後交出什麼。
      </p>

      {DEPT_ORDER.map((dept) => {
        const deptItems = items.filter((a) => a.dept === dept);
        if (deptItems.length === 0) return null;
        return (
          <div key={dept} className="mt-10">
            <div className="flex items-baseline gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{dept}</h2>
              <span className="text-xs text-neutral-400">{deptItems.length} 位</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {deptItems.map((a) => (
                <CatalogAgentCard key={a.id} agent={a} />
              ))}
            </div>
          </div>
        );
      })}

      <p className="mt-10 text-center text-sm text-neutral-400">
        還想找更能扛系統整合與判斷的職務？看看{" "}
        <Link href="/agents-catalog/professional" className="font-medium text-[#06C755]">
          專業型 Agent
        </Link>
        。
      </p>
      <p className="mt-1 text-center text-xs text-neutral-300 dark:text-neutral-600">
        共 {AGENT_CATALOG.length} 種 Agent，此頁顯示通用型 {items.length} 種
      </p>
    </div>
  );
}
