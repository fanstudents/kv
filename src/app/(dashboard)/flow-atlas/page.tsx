"use client";

import { useState } from "react";
import { Workflow } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import FlowAtlas from "@/components/flow/FlowAtlas";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { AGENT_LIVE_TASKS } from "@/lib/agent-briefings";
import { useMarketingMode } from "@/lib/marketing-mode";

// 任務流程節點總表：把每位 Agent 各自的流程圖攤在同一張圖上。
//
// 各 Agent 頁面的 FlowCanvas 回答的是「他這一趟怎麼走」；這張總表回答的是
// 單看一位 Agent 看不出來的三件事——誰是交棒的樞紐、哪些外部服務被最多人共用、
// 哪幾條流程其實從頭到尾沒跟任何人交手。

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "marketing", label: "行銷 Team" },
  { key: "admin", label: "行政 Team" },
] as const;

export default function FlowAtlasPage() {
  const [marketingMode] = useMarketingMode();
  const [filter, setFilter] = useState<"all" | "marketing" | "admin">(
    marketingMode ? "marketing" : "all"
  );

  const scoped = AGENTS.filter(
    (a) => AGENT_LIVE_TASKS[a.slug] && (filter === "all" || agentTeam(a.slug) === filter)
  );

  // 統計吃的是畫面上正在顯示的那幾條泳道，數字才跟圖對得起來
  const nodeCount = scoped.reduce(
    (sum, a) => sum + AGENT_LIVE_TASKS[a.slug].flow.reduce((s, c) => s + c.nodes.length, 0),
    0
  );
  const handoffCount = scoped.reduce((sum, a) => {
    let n = 0;
    AGENT_LIVE_TASKS[a.slug].flow.forEach((c) =>
      c.nodes.forEach((node) => {
        if (node.handoff) n += 1;
        node.side?.forEach((s) => {
          if (s.handoff) n += 1;
        });
      })
    );
    return sum + n;
  }, 0);

  return (
    <div>
      <PageHeader
        title="任務流程節點總表"
        description="全隊每一條流程攤在同一張圖上，加上「誰交棒給誰」的網狀連線——滑過任一位 Agent 就只亮出他這條線"
      />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "條流程", value: scoped.length },
          { label: "個節點", value: nodeCount },
          { label: "次交棒", value: handoffCount },
          {
            label: "個外部服務",
            value: new Set(
              scoped
                .flatMap((a) =>
                  AGENT_LIVE_TASKS[a.slug].flow.flatMap((c) =>
                    c.nodes.flatMap((n) => [n.app, ...(n.side ?? []).map((s) => s.app)])
                  )
                )
                .filter((app): app is string => Boolean(app))
            ).size,
          },
        ].map((s) => (
          <Card key={s.label}>
            <p className="font-mono text-2xl font-semibold text-neutral-900 dark:text-white">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                : "border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Workflow size={16} className="text-[#06C755]" />
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            全隊流程網
          </h2>
          <span className="text-xs text-neutral-400">
            一位 Agent 一條泳道，由左往右是他的流程；跨泳道的曲線是交棒
          </span>
        </div>
        <FlowAtlas filter={filter} />
      </Card>
    </div>
  );
}
