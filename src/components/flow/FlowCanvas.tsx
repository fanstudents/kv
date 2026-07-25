"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Check,
  Database,
  GitBranch,
  Send,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import BrandLogo from "@/components/integrations/BrandLogo";
import { AGENTS } from "@/lib/agent-data";
import type { FlowColumn, FlowNode, FlowNodeKind } from "@/lib/agent-briefings";

// 工作流程圖（劇院模式與一般模式共用同一份設計）。
//
// 一條主幹由左往右，分支欄用曲線散開再收攏；每個節點下面掛得住「旁支」——主線之外
// 順手做掉的事（寫進知識庫、通報隊友、留一份紀錄），用虛線小支線接著，一眼看得出
// 主線與支線的差別。任務進行時，走過的線上會有資料封包一路往右流，正在跑的那一段
// 流得更快更亮，未走的分支則淡出。
//
// 版面用固定 px 算好座標（SVG 畫線、HTML 疊節點），再依容器寬度整體縮放，
// 所以同一張圖在劇院大螢幕與後台卡片裡都是同一個設計、同一種比例。

const COL_W = 190; // 每一欄的水平間距
const ROW_H = 138; // 同一欄中多個節點的垂直間距
const PAD_X = 95; // 左右留白（半欄）
const TOP = 30; // 階段標題的高度
const BOTTOM = 44; // 旁支往下延伸的留白
const R = 20; // 節點半徑
const R_ACTIVE = 26;

type NodeState =
  | "idle" // 待命：中性展示
  | "pending" // 進行中但還沒走到
  | "done" // 已完成
  | "active" // 現正進行
  | "waiting" // 等待指示（琥珀）
  | "failed" // 這一步失敗
  | "ended" // 流程在此收尾（例如「先不要」）
  | "completed" // 成功走完（終點）
  | "untaken"; // 這次沒走的分支

/** 流程目前的推進狀態：劇院模式吃真實 live 進度，一般模式吃最近一次執行結果 */
export type FlowRun =
  | { mode: "idle" }
  | { mode: "live"; step: number; status: "active" | "waiting" | "done"; nodeId?: string }
  | { mode: "run"; status: "success" | "failed" | "pending" };

const KIND_ICON: Record<FlowNodeKind, LucideIcon> = {
  source: Database,
  process: Settings2,
  ai: Brain,
  decision: GitBranch,
  output: Send,
  store: Database,
};

interface Placed {
  node: FlowNode;
  col: number;
  x: number;
  y: number;
  state: NodeState;
}

interface Edge {
  id: string;
  d: string;
  /** taken=走過、current=正在走、idle=待命主幹、pending=還沒走、untaken=這次沒走 */
  state: "taken" | "current" | "idle" | "pending" | "untaken";
  /** 這條線上運送的資料（封包旁邊的小標） */
  data?: string;
  /** 是不是主幹（待命時只有主幹會跑資料封包，畫面才不會太吵） */
  spine: boolean;
  mid: { x: number; y: number };
}

/** 真實 live 進度 → 對應到哪一欄的哪個節點 */
function findLiveMatch(flow: FlowColumn[], step: number, status: string) {
  for (const cand of [`${step}:${status}`, `${step}`]) {
    for (let c = 0; c < flow.length; c++) {
      for (const n of flow[c].nodes) {
        if (n.live?.includes(cand)) return { col: c, id: n.id };
      }
    }
  }
  return null;
}

/** 這一欄「主幹會繼續走」的節點（沒標 main 就取第一個） */
function spineNode(col: FlowColumn): FlowNode {
  return col.nodes.find((n) => n.main) ?? col.nodes[0];
}

interface Match {
  col: number;
  id: string;
  status: "active" | "waiting" | "done" | "failed";
}

function resolveMatch(flow: FlowColumn[], run: FlowRun): Match | null {
  if (run.mode === "live") {
    // 有節點 id 就直接對應（執行紀錄與流程圖用的是同一組 id）；
    // 沒有才退回舊的「步驟編號 + 狀態」對照表。
    if (run.nodeId) {
      for (let c = 0; c < flow.length; c++) {
        const node = flow[c].nodes.find((n) => n.id === run.nodeId);
        if (node) return { col: c, id: node.id, status: run.status };
      }
    }
    const m = findLiveMatch(flow, run.step, run.status);
    return m ? { ...m, status: run.status } : null;
  }
  if (run.mode === "run") {
    if (run.status === "success") {
      const col = flow.length - 1;
      return { col, id: spineNode(flow[col]).id, status: "done" };
    }
    if (run.status === "pending") {
      const col = Math.min(flow.length - 1, Math.floor(flow.length / 2));
      return { col, id: spineNode(flow[col]).id, status: "active" };
    }
    const col = Math.max(0, flow.length - 2);
    return { col, id: spineNode(flow[col]).id, status: "failed" };
  }
  return null;
}

/** 這個節點是不是主幹：整欄只有它一個（即使掛了條件小標），或它被標成 main */
function isSpine(node: FlowNode, colSize: number): boolean {
  return colSize === 1 || Boolean(node.main);
}

function nodeState(node: FlowNode, col: number, colSize: number, match: Match | null): NodeState {
  if (!match) return "idle";
  if (col < match.col) return isSpine(node, colSize) ? "done" : "untaken";
  if (col > match.col) return "pending";
  if (node.id !== match.id) return "untaken";
  if (match.status === "waiting") return "waiting";
  if (match.status === "failed") return "failed";
  if (match.status === "done") return node.terminal ? "completed" : "ended";
  return "active";
}

const NEUTRAL = "var(--flow-line)";

function stateColor(state: NodeState, accent: string): string {
  if (state === "waiting") return "#F59E0B";
  if (state === "failed") return "#EF4444";
  if (state === "done" || state === "completed" || state === "active") return accent;
  return NEUTRAL;
}

export default function FlowCanvas({
  flow,
  color,
  run = { mode: "idle" },
  /** 劇院模式固定深色；後台跟著系統的淺／深色走 */
  theme = "auto",
}: {
  flow: FlowColumn[];
  color: string;
  run?: FlowRun;
  theme?: "auto" | "dark";
}) {
  const match = useMemo(() => resolveMatch(flow, run), [flow, run]);

  // ── 版面計算：先把每個節點放到固定座標，再依此畫線 ──
  const layout = useMemo(() => {
    const maxRows = Math.max(...flow.map((c) => c.nodes.length));
    const maxSides = Math.max(1, ...flow.flatMap((c) => c.nodes.map((n) => n.side?.length ?? 0)));
    const width = PAD_X * 2 + (flow.length - 1) * COL_W;
    const contentH = maxRows * ROW_H;
    const height = TOP + contentH + BOTTOM + Math.max(0, maxSides - 1) * 26;
    const centerY = TOP + contentH / 2;

    const placed: Placed[] = [];
    flow.forEach((colDef, col) => {
      const n = colDef.nodes.length;
      colDef.nodes.forEach((node, i) => {
        placed.push({
          node,
          col,
          x: PAD_X + col * COL_W,
          y: centerY + (i - (n - 1) / 2) * ROW_H,
          state: nodeState(node, col, n, match),
        });
      });
    });

    // 連線：單節點欄之間走直的貝茲；只要一端是分支欄就一對多／多對一散開，
    // 兩端都是分支欄則依序對應（避免畫成全連通的網子）。
    const edges: Edge[] = [];
    for (let c = 0; c < flow.length - 1; c++) {
      const from = placed.filter((p) => p.col === c);
      const to = placed.filter((p) => p.col === c + 1);
      const pairs: [Placed, Placed][] = [];
      if (from.length > 1 && to.length > 1) {
        const n = Math.min(from.length, to.length);
        for (let i = 0; i < n; i++) pairs.push([from[i], to[i]]);
      } else {
        from.forEach((a) => to.forEach((b) => pairs.push([a, b])));
      }

      pairs.forEach(([a, b], i) => {
        const x1 = a.x + R + 4;
        const x2 = b.x - R - 8;
        const dx = Math.max(28, (x2 - x1) * 0.5);
        const d = `M${x1},${a.y} C${x1 + dx},${a.y} ${x2 - dx},${b.y} ${x2},${b.y}`;

        // 待命時每條路都還是「可能會走的路」，一律中性呈現（只有主幹會有資料封包示意流向）；
        // 真的在跑時才把沒走的分支淡掉。
        let state: Edge["state"] = "pending";
        if (!match) {
          state = "idle";
        } else if (a.state === "untaken" || b.state === "untaken") {
          state = "untaken";
        } else if (c < match.col - 1) {
          state = "taken";
        } else if (c === match.col - 1) {
          state = match.status === "active" ? "taken" : "taken";
        } else if (c === match.col) {
          state = match.status === "active" || match.status === "waiting" ? "current" : "pending";
        }

        edges.push({
          id: `e-${c}-${i}`,
          d,
          state,
          data: a.node.data,
          spine: isSpine(a.node, from.length),
          mid: { x: (x1 + x2) / 2, y: (a.y + b.y) / 2 },
        });
      });
    }

    return { width, height, placed, edges };
  }, [flow, match]);

  // ── 依容器寬度整體縮放，讓同一張圖在大螢幕與後台卡片裡都完整看得到 ──
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, Math.max(0.52, w / layout.width)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout.width]);

  return (
    <div
      ref={wrapRef}
      className={`flow-canvas overflow-x-auto rounded-2xl border px-2 py-3 ${theme === "dark" ? "flow-dark" : ""}`}
      style={{ borderColor: "var(--flow-border)", background: "var(--flow-surface)" }}
    >
      <div style={{ width: layout.width * scale, height: layout.height * scale }}>
        <div
          className="relative"
          style={{ width: layout.width, height: layout.height, transform: `scale(${scale})`, transformOrigin: "0 0" }}
        >
          {/* 階段標題與分欄虛線 */}
          {flow.map((col, i) => (
            <div key={`stage-${i}`}>
              {col.title && (
                <span
                  className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tracking-[0.2em]"
                  style={{ left: PAD_X + i * COL_W, top: 2, color: "var(--flow-dim)" }}
                >
                  {col.title}
                </span>
              )}
              {i > 0 && (
                <span
                  className="absolute w-px"
                  style={{
                    left: PAD_X + i * COL_W - COL_W / 2,
                    top: TOP - 8,
                    height: layout.height - TOP - 12,
                    background: "var(--flow-grid)",
                  }}
                />
              )}
            </div>
          ))}

          {/* 連線層 */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            {layout.edges.map((e) => {
              const taken = e.state === "taken" || e.state === "current";
              const stroke = taken ? color : NEUTRAL;
              const opacity = e.state === "untaken" ? 0.25 : e.state === "pending" ? 0.55 : 1;
              return (
                <g key={e.id} opacity={opacity}>
                  <path
                    id={e.id}
                    d={e.d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={e.state === "current" ? 2 : 1.4}
                    strokeLinecap="round"
                    strokeDasharray={e.state === "untaken" ? "3 4" : undefined}
                  />
                  {/* 箭頭：標出資料往哪個方向流 */}
                  <ArrowHead d={e.d} color={stroke} />
                </g>
              );
            })}
          </svg>

          {/* 資料封包層：沿著連線往右流動（CSS motion path，尊重 prefers-reduced-motion） */}
          <div className="pointer-events-none absolute inset-0">
            {layout.edges.map((e) => {
              if (e.state === "untaken" || e.state === "pending") return null;
              if (e.state === "idle" && !e.spine) return null;
              const isCurrent = e.state === "current";
              const packets = isCurrent ? 3 : e.state === "taken" ? 2 : 1;
              const duration = isCurrent ? 1.3 : e.state === "taken" ? 2.1 : 3.6;
              const dot = isCurrent && match?.status === "waiting" ? "#F59E0B" : color;
              return Array.from({ length: packets }, (_, i) => (
                <span
                  key={`${e.id}-p${i}`}
                  className="flow-packet absolute left-0 top-0 rounded-full"
                  style={{
                    offsetPath: `path("${e.d}")`,
                    width: isCurrent ? 7 : 5,
                    height: isCurrent ? 7 : 5,
                    background: dot,
                    boxShadow: `0 0 ${isCurrent ? 12 : 7}px ${dot}`,
                    opacity: e.state === "idle" ? 0.5 : 1,
                    ["--packet-duration" as string]: `${duration}s`,
                    animationDelay: `${(i * duration) / packets}s`,
                  }}
                />
              ));
            })}
          </div>

          {/* 連線上的資料標籤：這一段實際運送的是什麼 */}
          {layout.edges.map((e) =>
            e.data && (e.state === "taken" || e.state === "current" || e.state === "idle") ? (
              <span
                key={`${e.id}-label`}
                className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[9px] font-medium"
                style={{
                  left: e.mid.x,
                  top: e.mid.y - 20,
                  color: e.state === "idle" ? "var(--flow-dim)" : color,
                  background: "var(--flow-chip)",
                }}
              >
                {e.data}
              </span>
            ) : null
          )}

          {/* 節點層 */}
          {layout.placed.map((p) => (
            <NodeView key={`${p.col}-${p.node.id}`} placed={p} accent={color} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 在貝茲曲線末端補一個小箭頭（用終點與控制點方向估算角度） */
function ArrowHead({ d, color }: { d: string; color: string }) {
  const nums = d.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 8) return null;
  const x3 = Number(nums[6]);
  const y3 = Number(nums[7]);
  const cx = Number(nums[4]);
  const cy = Number(nums[5]);
  const angle = (Math.atan2(y3 - cy, x3 - cx) * 180) / Math.PI;
  return (
    <polygon points={`0,-3 6,0 0,3`} fill={color} transform={`translate(${x3},${y3}) rotate(${angle})`} />
  );
}

function NodeView({ placed, accent }: { placed: Placed; accent: string }) {
  const { node, x, y, state } = placed;
  const isCurrent = state === "active" || state === "waiting" || state === "failed";
  const r = isCurrent ? R_ACTIVE : R;
  const tone = stateColor(state, accent);
  const kind = node.kind ?? "process";
  const Icon = KIND_ICON[kind];
  const partner = node.handoff ? AGENTS.find((a) => a.slug === node.handoff) : undefined;
  const shape = kind === "decision" ? "diamond" : kind === "source" || kind === "store" ? "square" : "circle";

  const filled = state === "done" || state === "completed";
  const dim = state === "untaken";

  const borderRadius = shape === "circle" ? "9999px" : shape === "square" ? "10px" : "6px";

  return (
    <>
      {/* 分支條件小標 */}
      {node.branch && (
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            left: x,
            top: y - r - 22,
            background: isCurrent ? `${tone}22` : "var(--flow-chip)",
            color: isCurrent ? tone : "var(--flow-muted)",
            opacity: dim ? 0.45 : 1,
          }}
        >
          {node.branch}
        </span>
      )}

      {/* 節點本體 */}
      <span
        className="absolute flex items-center justify-center"
        style={{ left: x, top: y, transform: "translate(-50%,-50%)", opacity: dim ? 0.4 : 1 }}
      >
        <span
          className={`relative flex items-center justify-center border-2 transition-all ${isCurrent ? "tv-breathe" : ""}`}
          style={{
            width: r * 2,
            height: r * 2,
            borderRadius,
            transform: shape === "diamond" ? "rotate(45deg)" : undefined,
            borderColor: state === "idle" || state === "pending" ? "var(--flow-node-border)" : tone,
            background: node.app
              ? "rgba(255,255,255,0.95)"
              : filled
                ? tone
                : isCurrent
                  ? `${tone}26`
                  : "var(--flow-node-bg)",
            boxShadow: isCurrent ? `0 0 18px -2px ${tone}` : "none",
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{ transform: shape === "diamond" ? "rotate(-45deg)" : undefined }}
          >
            {node.app ? (
              <BrandLogo brand={node.app} name={node.label} color={accent} size={r} bare />
            ) : filled ? (
              <Check size={15} strokeWidth={3} color="#05060a" />
            ) : state === "failed" ? (
              <X size={15} strokeWidth={3} color={tone} />
            ) : (
              <Icon size={15} color={isCurrent ? tone : "var(--flow-muted)"} />
            )}
          </span>
        </span>

        {/* 呼叫外部 app 的節點：進度改用角落小徽章，才不會蓋掉品牌 logo 的顏色 */}
        {node.app && (filled || isCurrent) && (
          <span
            className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full"
            style={{ background: tone, boxShadow: "0 0 0 2px var(--flow-ring)" }}
          >
            {filled && <Check size={9} strokeWidth={3} color="#05060a" />}
          </span>
        )}

        {/* 跟另一位隊友協同：疊一顆對方的小頭像 */}
        {partner && (
          <span
            className="absolute -right-2 -top-2 rounded-full"
            title={`與 ${partner.personEn} ${partner.personZh} 協同`}
            style={{ boxShadow: "0 0 0 2px var(--flow-ring)" }}
          >
            <Avatar personEn={partner.personEn} color={partner.color} size={17} ring={false} />
          </span>
        )}
      </span>

      {/* 名稱、說明與狀態 */}
      <span
        className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5 text-center"
        style={{ left: x, top: y + r + 8, width: COL_W - 26, opacity: dim ? 0.45 : 1 }}
      >
        <span
          className="text-[11.5px] font-semibold leading-tight"
          style={{ color: isCurrent ? tone : "var(--flow-text)" }}
        >
          {node.label}
          {state === "active" ? "…" : ""}
        </span>
        {node.detail && (
          <span className="text-[10px] leading-tight" style={{ color: "var(--flow-muted)" }}>
            {node.detail}
          </span>
        )}
        {partner && (
          <span className="text-[9.5px] font-medium" style={{ color: partner.color }}>
            與 {partner.personEn} 協同
          </span>
        )}
        {state === "waiting" && (
          <span className="rounded-full bg-amber-400/15 px-1.5 py-px text-[9px] font-medium text-amber-400">
            等待指示
          </span>
        )}
        {state === "failed" && (
          <span className="rounded-full bg-red-500/15 px-1.5 py-px text-[9px] font-medium text-red-400">
            這一步卡住
          </span>
        )}
        {state === "ended" && (
          <span className="rounded-full px-1.5 py-px text-[9px] font-medium" style={{ background: "var(--flow-chip)", color: "var(--flow-muted)" }}>
            已結束
          </span>
        )}
        {state === "completed" && (
          <span className="rounded-full px-1.5 py-px text-[9px] font-medium" style={{ background: `${accent}22`, color: accent }}>
            完成
          </span>
        )}
      </span>

      {/* 旁支：主線之外順手做掉的事，用虛線接在節點下方 */}
      {node.side?.map((s, i) => {
        const top = y + r + (node.detail ? 46 : 32) + i * 24;
        const partnerSide = s.handoff ? AGENTS.find((a) => a.slug === s.handoff) : undefined;
        return (
          <span key={`${node.id}-side-${i}`} style={{ opacity: dim ? 0.35 : 1 }}>
            {/* 虛線小支線 */}
            <span
              className="absolute w-px"
              style={{
                left: x,
                top: top - 8,
                height: 8,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--flow-line) 0 2px, transparent 2px 4px)`,
              }}
            />
            <span
              className="absolute flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-dashed px-1.5 py-0.5 text-[9.5px]"
              style={{
                left: x,
                top,
                borderColor: "var(--flow-line)",
                background: "var(--flow-chip)",
                color: "var(--flow-muted)",
              }}
            >
              {partnerSide ? (
                <Avatar personEn={partnerSide.personEn} color={partnerSide.color} size={12} ring={false} />
              ) : s.app ? (
                <BrandLogo brand={s.app} name={s.label} color={accent} size={11} bare />
              ) : (
                <span className="h-1 w-1 rounded-full" style={{ background: "var(--flow-line)" }} />
              )}
              {s.label}
            </span>
          </span>
        );
      })}
    </>
  );
}
