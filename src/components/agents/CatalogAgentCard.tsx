import { ChevronDown } from "lucide-react";
import Mascot from "./Mascot";
import ExplainerFlow from "./ExplainerFlow";
import { Badge } from "@/components/ui/Badge";
import { TIER_LABEL, TIER_PRICE, type CatalogAgent } from "@/lib/agent-catalog";

const TIER_TONE = { 1: "neutral", 2: "success", 3: "warning" } as const;

export default function CatalogAgentCard({ agent }: { agent: CatalogAgent }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <Mascot species={agent.species} color={agent.color} prop={agent.prop} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-900 dark:text-white">{agent.name}</p>
            <Badge tone={TIER_TONE[agent.tier]}>{TIER_LABEL[agent.tier]}</Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-400">
            {agent.id} · {agent.dept}
          </p>
        </div>
        <ChevronDown size={18} className="shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-neutral-100 px-4 pb-5 pt-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{agent.desc}</p>

        <p className="mb-3 mt-5 text-[11px] font-semibold tracking-wide text-neutral-400">運作流程</p>
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[420px]">
            <ExplainerFlow steps={agent.flow} />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
          <span className="text-neutral-400">{TIER_LABEL[agent.tier]}</span>
          <span className="font-medium text-neutral-700 dark:text-neutral-200">{TIER_PRICE[agent.tier]}</span>
        </div>
      </div>
    </details>
  );
}
