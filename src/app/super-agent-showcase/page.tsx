import type { Metadata } from "next";
import { getAgent } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

export const metadata: Metadata = {
  title: "超級 Agent 團隊｜原騰科技 MixAgent",
  description: "電商營運超級 Agent：主理人樊松蒲帶領六位 AI 隊友。",
};

// 電商營運超級 Agent 團隊編制，對照 src/lib/super-agent-data.ts 的 ecommerce 組
// members + 總管，共六位。
const TEAM_SLUGS: AgentSlug[] = ["orders", "support", "today", "report", "competitor", "teamlead"];

export default function SuperAgentShowcasePage() {
  const team = TEAM_SLUGS.map((slug) => getAgent(slug)).filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-16">
      {/* 背景：辦公室實景模糊 + 深色漸層罩，沿用登入頁的視覺語言 */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-sm"
        style={{ backgroundImage: "url(/office-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B2E1A]/90 via-[#0f2a20]/85 to-[#06120c]/95" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(6,199,85,0.4) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-[#9ED8B8]">SUPER AGENT · 電商營運</p>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-4xl">超級 Agent，帶領六位 AI 隊友</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
            主理人把多年操盤方法論寫進 Agent 團隊，每週看數據覆盤、逐項調教。
          </p>
        </div>

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
          {/* 左：主理人（超級 Agent） */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute inset-0 -m-3 rounded-full bg-[#06C755]/25 blur-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/managers/fan.png"
                alt="樊松蒲"
                className="relative h-40 w-40 rounded-full border-4 border-[#06C755] object-cover object-top shadow-2xl sm:h-48 sm:w-48"
              />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#06C755] px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-lg">
                超級 Agent
              </span>
            </div>
            <p className="mt-5 font-serif text-xl font-semibold text-white">樊松蒲</p>
            <p className="mt-1 text-xs text-white/50">電商營運操盤手</p>
          </div>

          {/* 連接線：桌面版橫線，行動版直線 */}
          <div className="h-10 w-px bg-gradient-to-b from-[#06C755]/70 to-transparent lg:h-px lg:w-16 lg:bg-gradient-to-r" />

          {/* 右：六位 Agent */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {team.map((agent) => (
              <div key={agent.slug} className="flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/avatars/${agent.personEn.toLowerCase()}.jpg`}
                  alt={agent.personZh}
                  className="h-20 w-20 rounded-full border-2 object-cover object-top shadow-lg sm:h-24 sm:w-24"
                  style={{ borderColor: agent.color }}
                />
                <p className="mt-3 text-sm font-semibold text-white">{agent.name}</p>
                <p className="mt-0.5 text-[11px] text-white/45">{agent.personZh}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
