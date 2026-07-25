"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  Database,
  GitBranch,
  Send,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import BrandLogo from "@/components/integrations/BrandLogo";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { AGENT_LIVE_TASKS, type FlowNode, type FlowNodeKind } from "@/lib/agent-briefings";
import type { AgentSlug } from "@/lib/types";

// 任務流程節點總表：把全隊每一位 Agent 的流程攤在同一張圖上，再把「誰交棒給誰」
// 畫成橫跨泳道的網狀連線。
//
// 跟單一 Agent 的 FlowCanvas 是同一套設計語言（節點形狀依 kind、外部服務顯示品牌
// logo、協同疊隊友頭像、旁支用虛線），差別只在這裡一位 Agent 佔一條泳道、節點縮小，
// 因為要一次看完 13 條流程。單張圖看得到的東西是 FlowCanvas 看不到的：
// 哪幾位是樞紐、哪些外部服務被最多人共用、哪些流程其實從頭到尾沒跟別人交手。

const LANE_H = 108; // 一條泳道的高度
const COL_W = 132; // 每一欄的水平間距
const PAD_L = 168; // 左側 Agent 名牌的寬度
const PAD_R = 40;
const TOP = 34; // 頂部階段刻度
const R = 15; // 節點半徑

const KIND_ICON: Record<FlowNodeKind, LucideIcon> = {
  source: Database,
  process: Settings2,
  ai: Brain,
  decision: GitBranch,
  output: Send,
  store: Database,
};

const KIND_LABEL: Record<FlowNodeKind, string> = {
  source: "取數",
  process: "處理",
  ai: "AI 判讀",
  decision: "分歧",
  output: "送出",
  store: "留存",
};

interface PlacedNode {
  key: string;
  node: FlowNode;
  slug: AgentSlug;
  x: number;
  y: number;
  col: number;
  /** 同一欄有多個節點時的垂直微調（分支） */
  branchOffset: number;
}

interface Lane {
  slug: AgentSlug;
  personEn: string;
  personZh: string;
  role: string;
  color: string;
  team: "marketing" | "admin";
  y: number;
  nodes: PlacedNode[];
  /** 這條泳道的主幹連線 */
  spine: string;
  cols: number;
}

/** 交棒：從某個節點指到另一位 Agent 的泳道 */
interface MeshLink {
  id: string;
  from: PlacedNode;
  toSlug: AgentSlug;
  toY: number;
  color: string;
  d: string;
  /** 旁支交棒（虛線）還是主線協同（實線） */
  side: boolean;
}

export default function FlowAtlas({
  filter = "all",
}: {
  filter?: "all" | "marketing" | "admin";
}) {
  const [hover, setHover] = useState<AgentSlug | null>(null);
  const [focusApp, setFocusApp] = useState<string | null>(null);

  const { lanes, links, width, height, maxCols, apps } = useMemo(() => {
    const visible = AGENTS.filter(
      (a) => AGENT_LIVE_TASKS[a.slug] && (filter === "all" || agentTeam(a.slug) === filter)
    );

    const lanes: Lane[] = [];
    let maxCols = 0;

    visible.forEach((agent, laneIdx) => {
      const def = AGENT_LIVE_TASKS[agent.slug];
      const y = TOP + laneIdx * LANE_H + LANE_H / 2;
      const nodes: PlacedNode[] = [];

      def.flow.forEach((col, ci) => {
        const x = PAD_L + ci * COL_W + COL_W / 2;
        // 一欄多個節點＝分支：主幹留在中線，其餘往下錯開
        const mainIdx = col.nodes.findIndex((n) => n.main);
        col.nodes.forEach((node, ni) => {
          const isMain = mainIdx === -1 ? ni === 0 : node.main === true;
          const rank = isMain ? 0 : ni <= (mainIdx === -1 ? 0 : mainIdx) ? -1 : 1;
          nodes.push({
            key: `${agent.slug}-${node.id}`,
            node,
            slug: agent.slug,
            x,
            y: y + rank * 30,
            col: ci,
            branchOffset: rank,
          });
        });
      });

      maxCols = Math.max(maxCols, def.flow.length);

      // 主幹：每一欄的主節點串起來
      const spinePts = def.flow.map((col, ci) => {
        const main = col.nodes.find((n) => n.main) ?? col.nodes[0];
        const placed = nodes.find((p) => p.node.id === main.id && p.col === ci)!;
        return placed;
      });
      const spine = spinePts
        .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
        .join(" ");

      lanes.push({
        slug: agent.slug,
        personEn: agent.personEn,
        personZh: agent.personZh,
        role: agent.role,
        color: agent.color,
        team: agentTeam(agent.slug),
        y,
        nodes,
        spine,
        cols: def.flow.length,
      });
    });

    // 交棒網：node.handoff 與 side[].handoff 都算
    const laneY = new Map(lanes.map((l) => [l.slug, l.y]));
    const links: MeshLink[] = [];
    lanes.forEach((lane) => {
      lane.nodes.forEach((p) => {
        const targets: { slug: AgentSlug; side: boolean }[] = [];
        if (p.node.handoff) targets.push({ slug: p.node.handoff, side: false });
        p.node.side?.forEach((s) => {
          if (s.handoff) targets.push({ slug: s.handoff, side: true });
        });
        targets.forEach((t, ti) => {
          const ty = laneY.get(t.slug);
          if (ty === undefined || ty === lane.y) return;
          // 往目標泳道拉一條貝茲曲線，橫向偏移讓多條線不重疊
          const dx = 46 + ti * 14;
          const d = `M${p.x},${p.y} C${p.x + dx},${p.y} ${p.x + dx},${ty} ${p.x + dx + 16},${ty}`;
          links.push({
            id: `${p.key}-to-${t.slug}-${ti}`,
            from: p,
            toSlug: t.slug,
            toY: ty,
            color: AGENTS.find((a) => a.slug === t.slug)?.color ?? "#71717a",
            d,
            side: t.side,
          });
        });
      });
    });

    // 這張圖上出現過的外部服務
    const appSet = new Map<string, number>();
    lanes.forEach((l) =>
      l.nodes.forEach((p) => {
        if (p.node.app) appSet.set(p.node.app, (appSet.get(p.node.app) ?? 0) + 1);
        p.node.side?.forEach((s) => {
          if (s.app) appSet.set(s.app, (appSet.get(s.app) ?? 0) + 1);
        });
      })
    );
    const apps = [...appSet.entries()].sort((a, b) => b[1] - a[1]);

    return {
      lanes,
      links,
      width: PAD_L + maxCols * COL_W + PAD_R,
      height: TOP + lanes.length * LANE_H + 16,
      maxCols,
      apps,
    };
  }, [filter]);

  const dimmed = (slug: AgentSlug) => hover !== null && hover !== slug;

  return (
    <div className="overflow-x-auto">
      <div className="relative" style={{ width, minWidth: width }}>
        {/* 階段刻度：各 Agent 的流程階段數不同，這裡只標「第幾站」 */}
        <div className="absolute inset-x-0 top-0 flex" style={{ height: TOP, paddingLeft: PAD_L }}>
          {Array.from({ length: maxCols }).map((_, i) => (
            <span
              key={i}
              className="flex items-center justify-center text-[10px] font-medium tracking-[0.18em]"
              style={{ width: COL_W, color: "var(--flow-muted)" }}
            >
              第 {i + 1} 站
            </span>
          ))}
        </div>

        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          aria-hidden="true"
        >
          {/* 泳道底線 */}
          {lanes.map((l) => (
            <line
              key={`base-${l.slug}`}
              x1={PAD_L}
              y1={l.y}
              x2={PAD_L + l.cols * COL_W - COL_W / 2}
              y2={l.y}
              stroke="var(--flow-line)"
              strokeWidth={1}
              strokeOpacity={dimmed(l.slug) ? 0.25 : 0.5}
            />
          ))}

          {/* 交棒網：橫跨泳道的曲線 */}
          {links.map((k) => {
            const on = hover === null || hover === k.from.slug || hover === k.toSlug;
            return (
              <g key={k.id} opacity={on ? 1 : 0.08}>
                <path
                  d={k.d}
                  fill="none"
                  stroke={k.color}
                  strokeWidth={hover === k.from.slug || hover === k.toSlug ? 1.6 : 1}
                  strokeOpacity={hover === k.from.slug || hover === k.toSlug ? 0.9 : 0.32}
                  strokeDasharray={k.side ? "3 5" : undefined}
                />
                <circle cx={k.from.x} cy={k.from.y} r={2.4} fill={k.color} opacity={0.9} />
              </g>
            );
          })}

          {/* 主幹 */}
          {lanes.map((l) => (
            <path
              key={`spine-${l.slug}`}
              d={l.spine}
              fill="none"
              stroke={l.color}
              strokeWidth={2}
              strokeOpacity={dimmed(l.slug) ? 0.15 : 0.55}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* 泳道名牌 */}
        {lanes.map((l) => (
          <button
            key={`label-${l.slug}`}
            type="button"
            onMouseEnter={() => setHover(l.slug)}
            onMouseLeave={() => setHover(null)}
            className="absolute flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
            style={{
              left: 0,
              top: l.y - 22,
              width: PAD_L - 18,
              opacity: dimmed(l.slug) ? 0.35 : 1,
            }}
          >
            <Avatar personEn={l.personEn} color={l.color} size={30} />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-[12.5px] font-semibold"
                style={{ color: "var(--flow-text)" }}
              >
                {l.personEn} <span className="font-normal opacity-60">{l.personZh}</span>
              </span>
              <span className="block truncate text-[10px]" style={{ color: l.color }}>
                {l.role}
              </span>
            </span>
          </button>
        ))}

        {/* 節點 */}
        {lanes.map((l) =>
          l.nodes.map((p) => {
            const kind = p.node.kind ?? "process";
            const Icon = KIND_ICON[kind];
            const shape =
              kind === "decision" ? "diamond" : kind === "source" || kind === "store" ? "square" : "circle";
            const borderRadius = shape === "circle" ? "9999px" : shape === "square" ? "8px" : "5px";
            const partner = p.node.handoff
              ? AGENTS.find((a) => a.slug === p.node.handoff)
              : undefined;
            // 篩選外部服務時，節點自己打的與掛在旁支上的都算——旁支的品牌（例如
            // 知識庫那條「網址匯入抓正文」）在總表上沒有獨立節點，只能亮它的母節點
            const usesFocusApp =
              focusApp === null ||
              p.node.app === focusApp ||
              (p.node.side?.some((s) => s.app === focusApp) ?? false);
            const appDim = !usesFocusApp;
            const off = dimmed(l.slug) || appDim;

            return (
              <span
                key={p.key}
                className="group absolute"
                style={{
                  left: p.x,
                  top: p.y,
                  transform: "translate(-50%,-50%)",
                  opacity: off ? 0.22 : 1,
                  zIndex: 2,
                }}
                onMouseEnter={() => setHover(l.slug)}
                onMouseLeave={() => setHover(null)}
              >
                <span
                  className="relative flex items-center justify-center border-2"
                  style={{
                    width: R * 2,
                    height: R * 2,
                    borderRadius,
                    transform: shape === "diamond" ? "rotate(45deg)" : undefined,
                    borderColor: p.node.app ? "var(--flow-node-border)" : l.color,
                    background: p.node.app ? "rgba(255,255,255,0.95)" : "var(--flow-node-bg)",
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{ transform: shape === "diamond" ? "rotate(-45deg)" : undefined }}
                  >
                    {p.node.app ? (
                      <BrandLogo brand={p.node.app} name={p.node.label} color={l.color} size={15} bare />
                    ) : (
                      <Icon size={12} color={l.color} />
                    )}
                  </span>
                  {partner && (
                    <span
                      className="absolute -right-1.5 -top-1.5 rounded-full"
                      style={{ boxShadow: "0 0 0 2px var(--flow-ring)" }}
                    >
                      <Avatar personEn={partner.personEn} color={partner.color} size={13} ring={false} />
                    </span>
                  )}
                </span>

                {/* 節點名稱：只在滑到這條泳道時展開，平常保持安靜 */}
                <span
                  className="pointer-events-none absolute left-1/2 top-full mt-1 w-[118px] -translate-x-1/2 text-center text-[9.5px] leading-tight transition-opacity"
                  style={{
                    color: "var(--flow-muted)",
                    opacity: hover === l.slug ? 1 : 0,
                  }}
                >
                  {p.node.label}
                </span>

                {/* 停留時的完整說明 */}
                <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-left shadow-lg group-hover:block dark:border-neutral-700 dark:bg-neutral-900">
                  <span className="block text-[11px] font-semibold text-neutral-900 dark:text-white">
                    {p.node.label}
                  </span>
                  {p.node.detail && (
                    <span className="mt-0.5 block text-[10px] text-neutral-500 dark:text-neutral-400">
                      {p.node.detail}
                    </span>
                  )}
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      className="rounded-full px-1.5 py-px text-[9px] font-medium"
                      style={{ background: `${l.color}1f`, color: l.color }}
                    >
                      {KIND_LABEL[kind]}
                    </span>
                    {p.node.app && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-px text-[9px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {p.node.app}
                      </span>
                    )}
                    {p.node.branch && (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-px text-[9px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {p.node.branch}
                      </span>
                    )}
                  </span>
                </span>
              </span>
            );
          })
        )}

        <div style={{ height }} />
      </div>

      {/* 圖例 */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-neutral-200 pt-4 text-[11px] dark:border-neutral-800">
        <span className="font-semibold text-neutral-500 dark:text-neutral-400">節點性質</span>
        {(["source", "process", "ai", "decision", "output"] as FlowNodeKind[]).map((k) => {
          const Icon = KIND_ICON[k];
          const shape = k === "decision" ? "diamond" : k === "source" || k === "store" ? "square" : "circle";
          return (
            <span key={k} className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <span
                className="flex h-5 w-5 items-center justify-center border-2 border-neutral-400"
                style={{
                  borderRadius: shape === "circle" ? "9999px" : shape === "square" ? "6px" : "4px",
                  transform: shape === "diamond" ? "rotate(45deg)" : undefined,
                }}
              >
                <Icon
                  size={10}
                  className="text-neutral-400"
                  style={{ transform: shape === "diamond" ? "rotate(-45deg)" : undefined }}
                />
              </span>
              {KIND_LABEL[k]}
            </span>
          );
        })}
        <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
          <svg width="26" height="8">
            <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.6" />
          </svg>
          交棒隊友
        </span>
        <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
          <svg width="26" height="8">
            <line
              x1="0"
              y1="4"
              x2="26"
              y2="4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeOpacity="0.6"
              strokeDasharray="3 5"
            />
          </svg>
          旁支交棒
        </span>
      </div>

      {/* 外部服務：點一個就只亮出用到它的節點 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          共用的外部服務
        </span>
        {apps.map(([app, n]) => (
          <button
            key={app}
            type="button"
            onClick={() => setFocusApp(focusApp === app ? null : app)}
            className={`flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2.5 text-[11px] transition-colors ${
              focusApp === app
                ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            <BrandLogo brand={app} name={app} color="#71717a" size={14} bare />
            {app}
            <span className="text-neutral-400">{n}</span>
          </button>
        ))}
        {focusApp && (
          <button
            type="button"
            onClick={() => setFocusApp(null)}
            className="text-[11px] text-neutral-400 underline underline-offset-2"
          >
            取消篩選
          </button>
        )}
      </div>
    </div>
  );
}
