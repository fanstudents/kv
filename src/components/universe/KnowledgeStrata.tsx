"use client";

import { useMemo } from "react";
import Avatar from "@/components/agents/Avatar";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { KNOWLEDGE_LEVELS } from "@/lib/knowledge-base-data";
import { AGENT_ACCESS_DEMO, KNOWLEDGE_DOMAINS } from "@/lib/marketing-graph";
import type { AgentSlug } from "@/lib/types";

// 節點宇宙的「底層」：知識庫分級治理。四級資料由深(L4 高敏感,浮在最上/最裡)到淺
// (L1 公開,鋪在最底)堆成一座立體資料庫，每一級旁邊站著「讀取上限涵蓋這一級」的 Agent。
// 一位 Agent 會出現在他等級(含)以下的每一層——這條「縱向出現」就是分級治理下的網狀連動：
// 高敏感層只有少數幾位站得上去，公開層則全員都在，一眼看出治理的收斂。

export default function KnowledgeStrata({ marketingMode }: { marketingMode: boolean }) {
  const agents = useMemo(
    () => (marketingMode ? AGENTS.filter((a) => agentTeam(a.slug) === "marketing") : AGENTS),
    [marketingMode]
  );

  const accessOf = (slug: AgentSlug) => AGENT_ACCESS_DEMO[slug] ?? 1;

  // 由高到低堆疊(L4 在最上/最裡)
  const tiers = [...KNOWLEDGE_LEVELS].reverse();

  return (
    <section className="relative z-10 mx-auto w-full max-w-[1100px] px-6 pb-24 pt-8">
      <div className="mb-8 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-medium tracking-[0.3em] text-white/50">
          知 識 庫 分 級 治 理
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[11px] leading-relaxed text-white/30">
          宇宙的底層是一座四級資料庫。每位 Agent 只能讀到自己等級（含）以下的知識——同一位隊友會沿著多層往下連通，
          愈敏感的資料，站得上去的 Agent 愈少，這就是分級治理下的網狀結構。
        </p>
      </div>

      {/* 立體資料庫：整座往後傾，四層各自浮在不同深度 */}
      <div className="mx-auto" style={{ perspective: "1600px" }}>
        <div
          className="space-y-4"
          style={{ transformStyle: "preserve-3d", transform: "rotateX(24deg)" }}
        >
          {tiers.map((lv, i) => {
            const eligible = agents.filter((a) => accessOf(a.slug) >= lv.level);
            const domain = KNOWLEDGE_DOMAINS.find((d) => d.level === lv.level);
            // L4 浮最高(最裡)，L1 貼最底
            const depth = (tiers.length - 1 - i) * 26;
            return (
              <div
                key={lv.level}
                className="relative rounded-2xl border p-4 backdrop-blur-sm"
                style={{
                  transform: `translateZ(${depth}px)`,
                  borderColor: `${lv.color}55`,
                  background: `linear-gradient(135deg, ${lv.color}1f, rgba(5,7,14,0.6))`,
                  boxShadow: `0 24px 40px -20px ${lv.color}88, inset 0 1px 0 ${lv.color}33`,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* 左：等級 + 主題 */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white"
                        style={{ background: lv.color }}
                      >
                        <span className="tv-breathe h-1.5 w-1.5 rounded-full bg-white" />
                        {lv.label}
                      </span>
                      <span className="text-[11px] text-white/40">{lv.aiUsage}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {domain?.topics.map((t) => (
                        <span
                          key={t}
                          className="rounded-md border px-2 py-0.5 text-[10px] text-white/70"
                          style={{ borderColor: `${lv.color}44`, background: `${lv.color}12` }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 右：可讀取這一級的 Agent（縱向網狀的節點） */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[10px] tracking-wider text-white/35">
                      {eligible.length} 位可讀取
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {eligible.length === 0 ? (
                        <span className="text-[10px] text-white/25">無 Agent 授權</span>
                      ) : (
                        eligible.map((a) => (
                          <span
                            key={a.slug}
                            title={`${a.personEn} ${a.personZh}・讀取上限含 ${lv.label}`}
                            className="rounded-full ring-2"
                            style={{ boxShadow: `0 0 10px -2px ${lv.color}`, ["--tw-ring-color" as string]: `${lv.color}66` }}
                          >
                            <Avatar personEn={a.personEn} color={a.color} size={26} />
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 資料流動脈衝：沿著這一層左緣往上竄，示意即時讀取 */}
                {eligible.length > 0 && (
                  <span
                    className="pointer-events-none absolute left-0 top-3 bottom-3 w-0.5 overflow-hidden rounded-full"
                    style={{ background: `${lv.color}33` }}
                  >
                    <span
                      className="absolute inset-x-0 h-6 rounded-full"
                      style={{ background: lv.color, animation: "kb-strata-flow 1.8s linear infinite", bottom: 0 }}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes kb-strata-flow {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-320%); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
