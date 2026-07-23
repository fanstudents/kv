"use client";

import { Database, Lock, ShieldAlert, Users } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/knowledge-base-data";
import type { AgentSlug } from "@/lib/types";

// 分級管線示意圖：四座資料平台由淺到深排開，中間用會流動的虛線點表示資料
// 一路往高敏感等級遞進；每座平台下方是「讀得到這一級」的 Agent 頭像，
// 頭像往上接一條會脈動的細線，表示他們正在存取這一級的資料。

const LEVEL_ICON: Record<KnowledgeLevel, React.ComponentType<{ size?: number; className?: string }>> = {
  1: Database,
  2: Users,
  3: ShieldAlert,
  4: Lock,
};

function agentsAtLevel(access: Record<AgentSlug, KnowledgeLevel>, level: KnowledgeLevel) {
  return AGENTS.filter((a) => (access[a.slug] ?? 1) >= level);
}

export default function LevelPipeline({ access }: { access: Record<AgentSlug, KnowledgeLevel> }) {
  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <style>{`
        @keyframes kb-flow-x {
          0% { transform: translateX(-6px); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(calc(100% + 6px)); opacity: 0; }
        }
        @keyframes kb-flow-y {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>

      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">資料分級管線</h2>
        <p className="text-xs text-neutral-400">頭像往上的線＝這位 Agent 正在讀取這一級資料</p>
      </div>

      <div className="flex min-w-[900px] items-stretch">
        {KNOWLEDGE_LEVELS.map((lv, i) => {
          const Icon = LEVEL_ICON[lv.level];
          const eligible = agentsAtLevel(access, lv.level);
          const isVault = lv.level === 4;

          return (
            <div key={lv.level} className="flex flex-1 items-stretch">
              {/* 平台與存取中的 Agent */}
              <div className="flex flex-1 flex-col items-center">
                <div
                  className={`relative flex w-full flex-col items-center rounded-2xl px-4 pb-4 pt-5 ${
                    isVault ? "border-2 border-dashed" : "border"
                  }`}
                  style={{
                    borderColor: `${lv.color}55`,
                    background: `linear-gradient(180deg, ${lv.color}14 0%, ${lv.color}05 100%)`,
                  }}
                >
                  {isVault && (
                    <span
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-white shadow"
                      style={{ backgroundColor: lv.color }}
                      title="嚴格控管"
                    >
                      <Lock size={12} />
                    </span>
                  )}
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl shadow-inner"
                    style={{ backgroundColor: `${lv.color}22`, color: lv.color }}
                  >
                    <Icon size={20} />
                  </span>
                  <span
                    className="mt-2.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: `${lv.color}1A`, color: lv.color }}
                  >
                    {lv.label}
                  </span>
                  <p className="mt-1.5 text-center text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
                    {lv.dataTypes}
                  </p>
                </div>

                {/* 垂直脈動線：平台 → Agent 頭像列 */}
                <div className="relative h-6 w-px overflow-hidden" style={{ backgroundColor: `${lv.color}33` }}>
                  {eligible.length > 0 && (
                    <span
                      className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
                      style={{ backgroundColor: lv.color, animation: "kb-flow-y 1.6s linear infinite" }}
                    />
                  )}
                </div>

                {/* 讀得到這一級的 Agent 頭像 */}
                <div className="flex min-h-[34px] max-w-[170px] flex-wrap justify-center gap-1">
                  {eligible.length === 0 ? (
                    <span className="text-[10px] text-neutral-300 dark:text-neutral-600">尚無 Agent</span>
                  ) : (
                    eligible.map((a) => (
                      <span key={a.slug} title={`${a.name} 讀取上限含此級`} className="ring-2 ring-white dark:ring-neutral-900 rounded-full">
                        <Avatar personEn={a.personEn} color={a.color} size={22} />
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* 平台之間的水平虛線＋流動資料點 */}
              {i < KNOWLEDGE_LEVELS.length - 1 && (
                <div className="relative mx-1 flex w-10 shrink-0 items-start pt-[42px]">
                  <div
                    className="relative h-px w-full overflow-hidden"
                    style={{
                      backgroundImage: `repeating-linear-gradient(90deg, ${lv.color}88 0 4px, transparent 4px 8px)`,
                    }}
                  >
                    <span
                      className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                      style={{ backgroundColor: lv.color, animation: `kb-flow-x 2.2s linear infinite ${i * 0.3}s` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
