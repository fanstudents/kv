"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Megaphone, Orbit, X } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import BrandLogo from "@/components/integrations/BrandLogo";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { INTEGRATION_SEEDS, type Integration } from "@/lib/integrations-data";
import { useMarketingMode } from "@/lib/marketing-mode";
import type { AgentSlug } from "@/lib/types";

// 節點宇宙：所有 Agent 是星系裡的星體，彼此的連線與串接的服務都是真實資料
// （AGENTS、INTEGRATION_SEEDS——跟 /integrations 管理頁同一份，不是另外編的）。
// Team Lead 在中心，因為她真的會彙整全隊每一位的 line_agent_activity；
// 約拜訪／行程助理之間有一條特別連線，因為排拜訪時查的是同一份真實 Google 日曆。

const TEAM_LEAD_SLUG: AgentSlug = "teamlead";
const CENTER = { x: 50, y: 53 };
const AGENT_RADIUS = { x: 26, y: 23 };
const SOURCE_RADIUS = { x: 45, y: 40 };

interface Pos {
  x: number;
  y: number;
}

type Selection = { kind: "agent"; slug: AgentSlug } | { kind: "source"; id: string } | null;

function circularMeanDeg(anglesDeg: number[]): number {
  if (anglesDeg.length === 0) return 0;
  const rad = anglesDeg.map((a) => (a * Math.PI) / 180);
  const sumSin = rad.reduce((s, r) => s + Math.sin(r), 0);
  const sumCos = rad.reduce((s, r) => s + Math.cos(r), 0);
  return (Math.atan2(sumSin, sumCos) * 180) / Math.PI;
}

// 純函式的偽隨機數（不用 Math.random）：星星位置只需要「看起來隨機」，
// 用確定性的雜湊即可，每次重繪都拿到同一片星空，不會閃爍跳動。
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// 四捨五入到固定精度：伺服器端與客戶端算出來的浮點數字串表示法偶爾會差在
// 小數點很後面（hydration mismatch 警告，非致命但吵），固定精度後兩邊必然一致。
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function useStarfield(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: round3(pseudoRandom(i * 3 + 1) * 100),
        y: round3(pseudoRandom(i * 7 + 2) * 100),
        size: round3(0.6 + pseudoRandom(i * 5 + 3) * 1.6),
        delay: round3(pseudoRandom(i * 11 + 4) * 3),
      })),
    [count]
  );
}

export default function UniversePage() {
  const stars = useStarfield(140);
  const [selection, setSelection] = useState<Selection>(null);
  const [marketingMode] = useMarketingMode();

  // 行銷模式：只留行銷 Team 的 Agent 圍成一圈，沒有 Team Lead 當中心
  // （呼應「你是 AI 行銷指揮官」的設定，中心不放任何一位 Agent）。
  const ringAgents = useMemo(() => {
    const base = AGENTS.filter((a) => a.slug !== TEAM_LEAD_SLUG);
    return marketingMode ? base.filter((a) => agentTeam(a.slug) === "marketing") : base;
  }, [marketingMode]);

  // 每位 Agent 的位置：Team Lead 在中心，其餘沿橢圓環均分角度
  const agentPos = useMemo(() => {
    const map = new Map<AgentSlug, Pos & { angle: number }>();
    map.set(TEAM_LEAD_SLUG, { x: CENTER.x, y: CENTER.y, angle: -90 });
    ringAgents.forEach((a, i) => {
      const angle = -90 + (360 / ringAgents.length) * i;
      const rad = (angle * Math.PI) / 180;
      map.set(a.slug, {
        x: CENTER.x + AGENT_RADIUS.x * Math.cos(rad),
        y: CENTER.y + AGENT_RADIUS.y * Math.sin(rad),
        angle,
      });
    });
    return map;
  }, [ringAgents]);

  // 每個資料來源的位置：落在使用它的那些 Agent 的平均角度方向、更外圈
  const sourcePos = useMemo(() => {
    const map = new Map<string, Pos>();
    INTEGRATION_SEEDS.forEach((src) => {
      const angles = src.uses.map((u) => agentPos.get(u.agent)?.angle ?? 0);
      const angle = circularMeanDeg(angles);
      const rad = (angle * Math.PI) / 180;
      map.set(src.id, {
        x: CENTER.x + SOURCE_RADIUS.x * Math.cos(rad),
        y: CENTER.y + SOURCE_RADIUS.y * Math.sin(rad),
      });
    });
    return map;
  }, [agentPos]);

  // 真實的 Agent↔Agent 關係：Team Lead 彙整全隊、約拜訪與行程助理共用行事曆
  // （行銷模式沒有 Team Lead 在場，這層關係也就沒有意義，直接留空）
  const agentEdges = useMemo(() => {
    if (marketingMode) return [];
    return [
      ...ringAgents.map((a) => ({ a: TEAM_LEAD_SLUG, b: a.slug, special: false })),
      { a: "visit" as AgentSlug, b: "schedule" as AgentSlug, special: true },
    ];
  }, [ringAgents, marketingMode]);

  const sourceEdges = useMemo(
    () =>
      INTEGRATION_SEEDS.flatMap((src) =>
        src.uses
          .filter((u) => !marketingMode || agentTeam(u.agent) === "marketing")
          .map((u) => ({ agent: u.agent, sourceId: src.id, feature: u.feature, connected: src.status === "connected" }))
      ),
    [marketingMode]
  );

  // 行銷模式下只留跟行銷 Agent 有連線的服務節點，不留孤兒節點
  const visibleSources = useMemo(() => {
    if (!marketingMode) return INTEGRATION_SEEDS;
    const usedIds = new Set(sourceEdges.map((e) => e.sourceId));
    return INTEGRATION_SEEDS.filter((s) => usedIds.has(s.id));
  }, [marketingMode, sourceEdges]);

  const visibleAgentNodes = marketingMode ? ringAgents : AGENTS;

  // 選取後要凸顯哪些節點：agent 選取會連帶點亮跟它有真實關係的同事與服務
  const { hlAgents, hlSources } = useMemo(() => {
    if (!selection) return { hlAgents: null as Set<AgentSlug> | null, hlSources: null as Set<string> | null };
    const agents = new Set<AgentSlug>();
    const sources = new Set<string>();
    if (selection.kind === "agent") {
      agents.add(selection.slug);
      if (selection.slug === TEAM_LEAD_SLUG) ringAgents.forEach((a) => agents.add(a.slug));
      else agents.add(TEAM_LEAD_SLUG);
      if (selection.slug === "visit") agents.add("schedule");
      if (selection.slug === "schedule") agents.add("visit");
      sourceEdges.forEach((e) => {
        if (e.agent === selection.slug) sources.add(e.sourceId);
      });
    } else {
      sources.add(selection.id);
      sourceEdges.forEach((e) => {
        if (e.sourceId === selection.id) agents.add(e.agent);
      });
    }
    return { hlAgents: agents, hlSources: sources };
  }, [selection, ringAgents, sourceEdges]);

  const isAgentDim = useCallback((slug: AgentSlug) => hlAgents !== null && !hlAgents.has(slug), [hlAgents]);
  const isSourceDim = useCallback((id: string) => hlSources !== null && !hlSources.has(id), [hlSources]);
  const isAgentEdgeDim = useCallback(
    (a: AgentSlug, b: AgentSlug) => hlAgents !== null && !(hlAgents.has(a) && hlAgents.has(b)),
    [hlAgents]
  );
  const isSourceEdgeDim = useCallback(
    (agent: AgentSlug, sourceId: string) =>
      hlAgents !== null && !(hlAgents.has(agent) && (hlSources?.has(sourceId) ?? false)),
    [hlAgents, hlSources]
  );

  const selectedAgent = selection?.kind === "agent" ? AGENTS.find((a) => a.slug === selection.slug) : null;
  const selectedSource = selection?.kind === "source" ? INTEGRATION_SEEDS.find((s) => s.id === selection.id) : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] text-white">
      {/* 星空背景 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[15%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[75vh] w-[75vh] rounded-full bg-[radial-gradient(circle,rgba(6,199,85,0.1),transparent_65%)] blur-3xl" />
        {stars.map((s) => (
          <span
            key={s.id}
            className="tv-breathe absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      {/* 頂列 */}
      <header className="relative z-20 flex items-center justify-between px-6 pt-6">
        <Link
          href="/tv"
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/55 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={15} />
          戰情看板
        </Link>
        <p className="flex items-center gap-2 text-sm font-medium tracking-[0.3em] text-white/50">
          <Orbit size={15} className="text-indigo-300" />
          節 點 宇 宙
        </p>
        {marketingMode ? (
          <span
            title="你是 AI 行銷指揮官，畫面只顯示行銷戰隊隊員與他們用的服務"
            className="flex w-[110px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-200"
          >
            <Megaphone size={13} />
            行銷模式
          </span>
        ) : (
          <span className="w-[110px]" />
        )}
      </header>
      <p className="relative z-20 mx-auto mt-2 max-w-lg px-6 text-center text-[11px] text-white/30">
        點一位 Agent 或一張服務卡，看看真實的連通關係——資料跟「服務串接」管理頁同一份，不是另外畫的。
      </p>

      {/* 星圖舞台 */}
      <div className="relative z-10 mx-auto mt-4 h-[calc(100vh-140px)] w-full max-w-[1500px]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {agentEdges.map((e, i) => {
            const from = agentPos.get(e.a);
            const to = agentPos.get(e.b);
            if (!from || !to) return null;
            const dim = isAgentEdgeDim(e.a, e.b);
            const color = e.special ? AGENTS.find((a) => a.slug === "visit")?.color ?? "#06C755" : "#ffffff";
            return (
              <line
                key={`ae-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={color}
                strokeWidth={e.special ? 0.35 : 0.15}
                opacity={dim ? 0.06 : e.special ? 0.75 : 0.22}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {sourceEdges.map((e, i) => {
            const from = agentPos.get(e.agent);
            const to = sourcePos.get(e.sourceId);
            if (!from || !to) return null;
            const dim = isSourceEdgeDim(e.agent, e.sourceId);
            return (
              <line
                key={`se-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={e.connected ? "#38bdf8" : "#ffffff"}
                strokeWidth={0.12}
                strokeDasharray={e.connected ? undefined : "1 1.2"}
                opacity={dim ? 0.05 : e.connected ? 0.35 : 0.18}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* Agent 節點 */}
        {visibleAgentNodes.map((a) => {
          const pos = agentPos.get(a.slug);
          if (!pos) return null;
          const isCenter = a.slug === TEAM_LEAD_SLUG;
          const dim = isAgentDim(a.slug);
          return (
            <button
              key={a.slug}
              type="button"
              onClick={() => setSelection((s) => (s?.kind === "agent" && s.slug === a.slug ? null : { kind: "agent", slug: a.slug }))}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 transition-opacity duration-300 focus:outline-none"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: dim ? 0.25 : 1 }}
            >
              <span
                className="relative flex items-center justify-center rounded-full"
                style={{ boxShadow: dim ? "none" : `0 0 ${isCenter ? 26 : 16}px -4px ${a.color}` }}
              >
                <Avatar personEn={a.personEn} color={a.color} size={isCenter ? 72 : 52} />
              </span>
              <span className={`whitespace-nowrap font-medium ${isCenter ? "text-sm" : "text-xs"} text-white/85`}>
                {a.personEn}
              </span>
            </button>
          );
        })}

        {/* 資料來源節點 */}
        {visibleSources.map((src) => {
          const pos = sourcePos.get(src.id);
          if (!pos) return null;
          const dim = isSourceDim(src.id);
          return (
            <button
              key={src.id}
              type="button"
              onClick={() => setSelection((s) => (s?.kind === "source" && s.id === src.id ? null : { kind: "source", id: src.id }))}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-opacity duration-300 focus:outline-none"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, opacity: dim ? 0.2 : 1 }}
            >
              <span
                className="relative rounded-2xl"
                style={{ boxShadow: dim || src.status !== "connected" ? "none" : `0 0 14px -3px ${src.color}` }}
              >
                <BrandLogo brand={src.icon} name={src.name} color={src.color} size={36} />
                {src.status !== "connected" && (
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#03040a] bg-white/30" />
                )}
              </span>
              <span className="whitespace-nowrap text-[10px] text-white/45">{src.name}</span>
            </button>
          );
        })}
      </div>

      {/* 側欄：選取的 Agent 或服務詳情。外層不接手點擊事件（pointer-events-none），
          這樣點別的節點可以直接切換選取，不必先關掉這張卡才點得到下一個節點。 */}
      {(selectedAgent || selectedSource) && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-end p-4 sm:p-6">
          <div className="tv-pop pointer-events-auto max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0d16]/95 p-6 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title="關閉"
            >
              <X size={14} />
            </button>

            {selectedAgent && <AgentPanel agent={selectedAgent} />}
            {selectedSource && <SourcePanel source={selectedSource} />}
          </div>
        </div>
      )}
    </main>
  );
}

function AgentPanel({ agent }: { agent: (typeof AGENTS)[number] }) {
  const uses = INTEGRATION_SEEDS.filter((src) => src.uses.some((u) => u.agent === agent.slug));
  const coordinationNote =
    agent.slug === "teamlead"
      ? "彙整全隊每一位同事過去 24 小時的真實動態紀錄。"
      : agent.slug === "visit"
        ? "安排拜訪時查詢行事曆空檔，讀的是行程助理 Milo 也在用的同一份真實 Google 日曆。"
        : agent.slug === "schedule"
          ? "讀取的行事曆跟約拜訪 Coco 排時段時查詢的是同一份真實資料。"
          : null;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Avatar personEn={agent.personEn} color={agent.color} size={56} />
        <div>
          <p className="text-lg font-medium">
            {agent.personEn} <span className="text-white/40">{agent.personZh}</span>
          </p>
          <p className="text-sm" style={{ color: agent.color }}>
            {agent.role}
          </p>
        </div>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-white/60">{agent.description}</p>

      {coordinationNote && (
        <div className="mb-5 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/60">
          <span className="mb-1 block text-[10px] font-semibold tracking-[0.15em] text-white/35">跨 Agent 協作</span>
          {coordinationNote}
        </div>
      )}

      <p className="mb-2.5 text-[11px] font-semibold tracking-[0.2em] text-white/40">使用的服務</p>
      {uses.length === 0 ? (
        <p className="text-sm text-white/30">目前沒有串接真實服務。</p>
      ) : (
        <ul className="space-y-2">
          {uses.map((src) => {
            const feature = src.uses.find((u) => u.agent === agent.slug)?.feature;
            return (
              <li key={src.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
                <BrandLogo brand={src.icon} name={src.name} color={src.color} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/85">{src.name}</p>
                  <p className="truncate text-xs text-white/40">{feature}</p>
                </div>
                {src.status !== "connected" && (
                  <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/45">待連線</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SourcePanel({ source }: { source: Integration }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <BrandLogo brand={source.icon} name={source.name} color={source.color} size={52} />
        <div>
          <p className="text-lg font-medium">{source.name}</p>
          <p className="text-sm text-white/45">
            {source.provider} · {source.category}
          </p>
        </div>
      </div>

      <span
        className={`mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          source.status === "connected" ? "bg-[#06C755]/15 text-[#06C755]" : "bg-amber-400/15 text-amber-300"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${source.status === "connected" ? "bg-[#06C755]" : "bg-amber-400"}`} />
        {source.status === "connected" ? "已連線" : "尚未連線"}
      </span>
      {source.note && <p className="mb-5 -mt-3 text-xs text-amber-200/70">{source.note}</p>}

      <p className="mb-2.5 text-[11px] font-semibold tracking-[0.2em] text-white/40">使用這個服務的同事</p>
      <ul className="mb-5 space-y-2">
        {source.uses.map((u) => {
          const agent = AGENTS.find((a) => a.slug === u.agent);
          if (!agent) return null;
          return (
            <li key={u.agent} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
              <Avatar personEn={agent.personEn} color={agent.color} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/85">
                  {agent.personEn} <span className="text-white/40">{agent.personZh}</span>
                </p>
                <p className="truncate text-xs text-white/40">{u.feature}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <a
        href={source.link}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
      >
        <ExternalLink size={14} /> 前往 {source.provider} 管理主控台
      </a>
    </div>
  );
}
