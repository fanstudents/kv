import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CatalogAgentCard from "@/components/agents/CatalogAgentCard";
import { AGENT_CATALOG, DEPT_ORDER, agentsByTier } from "@/lib/agent-catalog";

export const metadata = { title: "專業型 Agent｜Agent 目錄" };

export default function ProfessionalCatalogPage() {
  const items = agentsByTier([2, 3]);
  return (
    <div>
      <Link
        href="/agents-catalog"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={15} /> Agent 目錄總覽
      </Link>
      <p className="text-xs font-bold tracking-[0.2em] text-neutral-400">專業型・LEVEL 2</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white sm:text-3xl">
        接上你的系統，執行多步驟流程。
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        專業型 Agent 會串接 LINE OA、訂單、廣告後台或資料庫，依你的品牌口吻與 SOP 調教，處理需要多個步驟、
        跨系統資料的任務。重度職務（如對帳、營運報表）月費略高，帳算得清清楚楚。
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
            <div className="mt-4 grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              {deptItems.map((a) => (
                <CatalogAgentCard key={a.id} agent={a} />
              ))}
            </div>
          </div>
        );
      })}

      <p className="mt-10 text-center text-sm text-neutral-400">
        需要的不只是執行，還要有人扛策略與覆盤？看看{" "}
        <Link href="/agents-catalog/super" className="font-medium text-amber-600">
          超級 Agent
        </Link>
        。
      </p>
      <p className="mt-1 text-center text-xs text-neutral-300 dark:text-neutral-600">
        共 {AGENT_CATALOG.length} 種 Agent，此頁顯示專業型 {items.length} 種
      </p>
    </div>
  );
}
