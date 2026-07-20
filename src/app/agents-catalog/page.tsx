import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Card from "@/components/ui/Card";
import Mascot from "@/components/agents/Mascot";
import { AGENT_CATALOG, agentsByTier } from "@/lib/agent-catalog";
import { SUPER_AGENTS } from "@/lib/super-agent-data";

const TIERS = [
  {
    href: "/agents-catalog/general",
    tag: "通用型",
    title: "開箱即用的單一職務",
    desc: "不需客製串接，部署完當天上工。適合第一次導入、先試水溫的職務，例如售後關懷、排程提醒、履歷篩選。",
    price: "NT$1,500／月起",
    count: agentsByTier(1).length,
  },
  {
    href: "/agents-catalog/professional",
    tag: "專業型",
    title: "接上你的系統與 SOP",
    desc: "串接 LINE OA、訂單、廣告後台與資料庫，執行多步驟流程，依你的品牌口吻與 SOP 調教。",
    price: "NT$2,800–5,800／月",
    count: agentsByTier([2, 3]).length,
  },
  {
    href: "/agents-catalog/super",
    tag: "超級 Agent",
    title: "真人主理人帶隊的 Agent Team",
    desc: "一整組 Agent Team，由實戰主理人帶領：前 3 個月親自帶隊調教，之後可轉交你公司內部主管接手管理。",
    price: "NT$30,000／月起",
    count: SUPER_AGENTS.length,
  },
];

export default function AgentsCatalogIndexPage() {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.2em] text-[#06C755]">AGENT 目錄</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-white sm:text-3xl">
        {AGENT_CATALOG.length + SUPER_AGENTS.length} 種可以聘任的 AI 隊友，分三個等級。
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        每一位 Agent 點開都能看到實際的運作流程節點——接什麼系統、做哪些判斷、最後交出什麼結果，
        跟你在後台看到的一樣，不是行銷話術。挑一個等級看看細節，或直接從下面瀏覽全部。
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="text-[11px] font-bold tracking-[0.18em] text-neutral-400">{t.tag}</p>
              <h2 className="mt-2 text-lg font-semibold text-neutral-900 dark:text-white">{t.title}</h2>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t.desc}</p>
              <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
                <span className="text-neutral-400">{t.count} 種</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-200">{t.price}</span>
              </div>
              <span className="mt-3 flex items-center gap-1 text-xs font-medium text-[#06C755]">
                查看名冊 <ArrowRight size={12} />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white">全部 Agent 一覽</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {AGENT_CATALOG.map((a) => (
            <Link
              key={a.id}
              href={a.tier === 1 ? "/agents-catalog/general" : "/agents-catalog/professional"}
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3.5 text-xs text-neutral-600 transition-colors hover:border-[#06C755] hover:text-[#06C755] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            >
              <Mascot species={a.species} color={a.color} prop={a.prop} size={22} />
              {a.name}
            </Link>
          ))}
          {SUPER_AGENTS.map((sa) => (
            <Link
              key={sa.id}
              href="/agents-catalog/super"
              className="flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-500/5 py-1.5 pl-3.5 pr-3.5 text-xs font-medium text-amber-700 transition-colors hover:border-amber-500 dark:text-amber-400"
            >
              👑 {sa.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
