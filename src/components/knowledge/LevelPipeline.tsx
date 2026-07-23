"use client";

import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/knowledge-base-data";
import type { AgentSlug } from "@/lib/types";

// 分級管線示意圖：套用實際的分級主視覺（四座資料平台由淺到深、L4 封在玻璃機房裡），
// 用 HTML/CSS 在圖上標出每座平台的等級，圖片下方接一排「正在存取這一級」的
// Agent 頭像，頭像上方的脈動線示意資料傳輸。

// 標籤在主視覺上的位置（依圖片本身比例估算的百分比座標）
const LABEL_POS: Record<KnowledgeLevel, { left: string; top: string }> = {
  1: { left: "12%", top: "38%" },
  2: { left: "34%", top: "34%" },
  3: { left: "57%", top: "31%" },
  4: { left: "84%", top: "22%" },
};

function agentsAtLevel(access: Record<AgentSlug, KnowledgeLevel>, level: KnowledgeLevel) {
  return AGENTS.filter((a) => (access[a.slug] ?? 1) >= level);
}

export default function LevelPipeline({ access }: { access: Record<AgentSlug, KnowledgeLevel> }) {
  return (
    <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <style>{`
        @keyframes kb-flow-y {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">資料分級管線</h2>
        <p className="text-xs text-neutral-400">頭像上方的線＝這位 Agent 正在讀取這一級資料</p>
      </div>

      {/* 主視覺：四級資料平台，圖上疊 HTML/CSS 標籤 */}
      <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "1672 / 941" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/knowledge-tiers.png"
          alt="資料分級四級平台：L1 公開資料、L2 內部資料、L3 敏感資料、L4 高敏感資料（機房封存）"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {KNOWLEDGE_LEVELS.map((lv) => (
          <span
            key={lv.level}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-lg"
            style={{ left: LABEL_POS[lv.level].left, top: LABEL_POS[lv.level].top, backgroundColor: lv.color }}
          >
            {lv.label}
          </span>
        ))}
      </div>

      {/* 存取列：對齊四級，列出目前讀取上限涵蓋這一級的 Agent，做出旁邊存取的傳輸感 */}
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {KNOWLEDGE_LEVELS.map((lv) => {
          const eligible = agentsAtLevel(access, lv.level);
          return (
            <div key={lv.level} className="flex flex-col items-center">
              <div className="relative h-5 w-px overflow-hidden" style={{ backgroundColor: `${lv.color}44` }}>
                {eligible.length > 0 && (
                  <span
                    className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: lv.color, animation: "kb-flow-y 1.6s linear infinite" }}
                  />
                )}
              </div>
              <p className="mt-1 text-[11px] font-semibold" style={{ color: lv.color }}>
                {lv.label}
              </p>
              <div className="mt-1.5 flex min-h-[26px] max-w-[180px] flex-wrap justify-center gap-1">
                {eligible.length === 0 ? (
                  <span className="text-[10px] text-neutral-300 dark:text-neutral-600">尚無 Agent</span>
                ) : (
                  eligible.map((a) => (
                    <span
                      key={a.slug}
                      title={`${a.name} 讀取上限含此級`}
                      className="rounded-full ring-2 ring-white dark:ring-neutral-900"
                    >
                      <Avatar personEn={a.personEn} color={a.color} size={22} />
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
