"use client";

import { Check } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import { AGENTS } from "@/lib/agent-data";
import type { FlowColumn, FlowNode } from "@/lib/agent-briefings";
import type { LiveInfo } from "./LiveTask";

// 每位 Agent 的工作流程圖：主幹 + 分支（一欄多節點＝擇一走向）。
// 待命時整張圖以中性狀態展示（讓人看得懂這位 Agent 的完整流程）；
// 有真實任務時，依 live 進度把走過的節點打勾、目前節點放大呼吸、未走的分支淡出。

type NodeState =
  | "idle" // 待命：中性展示
  | "pending" // 進行中但還沒走到
  | "done" // 已完成
  | "active" // 現正進行
  | "waiting" // 等待指示（琥珀）
  | "ended" // 流程在此收尾（例如「先不要」）
  | "completed" // 成功走完（終點）
  | "untaken"; // 這次沒走的分支

function findMatch(flow: FlowColumn[], live: LiveInfo): { col: number; id: string } | null {
  const candidates = [`${live.step}:${live.status}`, `${live.step}`];
  for (const cand of candidates) {
    for (let c = 0; c < flow.length; c++) {
      for (const n of flow[c].nodes) {
        if (n.live?.includes(cand)) return { col: c, id: n.id };
      }
    }
  }
  return null;
}

function nodeState(
  node: FlowNode,
  colIndex: number,
  match: { col: number; id: string } | null,
  live: LiveInfo | null | undefined
): NodeState {
  if (!live?.active || !match) return "idle";
  if (colIndex < match.col) {
    // 已走過的欄：主幹節點視為完成；分支欄只有 main 走向算完成，其餘淡出
    const isSpine = node.main || !node.branch;
    return isSpine ? "done" : "untaken";
  }
  if (colIndex > match.col) return "pending";
  if (node.id !== match.id) return "untaken";
  if (live.status === "waiting") return "waiting";
  if (live.status === "done") return node.terminal ? "completed" : "ended";
  return "active";
}

function NodeView({ node, state, color }: { node: FlowNode; state: NodeState; color: string }) {
  const isCurrent = state === "active" || state === "waiting";
  const dot = state === "waiting" ? "#F59E0B" : color;
  const size = isCurrent ? 28 : 18;
  // 這一步實際上跟另一位 Agent 協同（例如查的是同一份真實行事曆），
  // 疊一顆對方小頭像做視覺連通，而不是假裝這只是自己一個人的步驟。
  const partner = node.handoff ? AGENTS.find((a) => a.slug === node.handoff) : undefined;

  const circleStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderColor:
      state === "done" || state === "completed"
        ? color
        : isCurrent
          ? dot
          : state === "ended"
            ? "rgba(255,255,255,0.45)"
            : state === "untaken"
              ? "rgba(255,255,255,0.12)"
              : state === "idle"
                ? "rgba(255,255,255,0.28)"
                : "rgba(255,255,255,0.16)",
    background:
      state === "done" || state === "completed"
        ? color
        : state === "active"
          ? `${color}33`
          : state === "waiting"
            ? "rgba(245,158,11,0.22)"
            : state === "ended"
              ? "rgba(255,255,255,0.32)"
              : "transparent",
    boxShadow: isCurrent ? `0 0 16px -2px ${dot}` : "none",
  };

  const labelClass =
    state === "untaken"
      ? "text-white/20"
      : state === "done" || state === "completed" || state === "ended"
        ? "text-white/60"
        : state === "pending"
          ? "text-white/30"
          : state === "idle"
            ? "text-white/50"
            : "font-semibold";

  return (
    <div className={`flex flex-col items-center gap-1 text-center ${state === "untaken" ? "opacity-60" : ""}`}>
      {node.branch && (
        <span
          className="rounded-full px-1.5 py-px text-[9px] font-medium leading-tight"
          style={{
            background: isCurrent ? `${dot}22` : "rgba(255,255,255,0.07)",
            color: isCurrent ? dot : "rgba(255,255,255,0.45)",
          }}
        >
          {node.branch}
        </span>
      )}
      <span className="relative flex shrink-0 items-center justify-center">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${isCurrent ? "tv-breathe" : ""}`}
          style={circleStyle}
        >
          {(state === "done" || state === "completed") && (
            <Check size={11} className="text-[#05060a]" strokeWidth={3} />
          )}
          {isCurrent && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
          {state === "ended" && <span className="h-1.5 w-1.5 rounded-full bg-[#05060a]" />}
        </span>
        {/* 這一步跟另一位 Agent 協同：疊一顆對方的小頭像，畫面上看得出是多人連通的節點 */}
        {partner && (
          <span
            className="absolute -right-1.5 -top-1.5 rounded-full ring-2 ring-[#0b0d12]"
            title={`與 ${partner.personEn} ${partner.personZh} 協同`}
          >
            <Avatar personEn={partner.personEn} color={partner.color} size={14} ring={false} />
          </span>
        )}
      </span>
      <span
        className={`max-w-[7.5rem] text-[11px] leading-tight ${labelClass}`}
        style={isCurrent ? { color: dot, fontSize: 12 } : undefined}
      >
        {node.label}
        {state === "active" ? "…" : ""}
      </span>
      {partner && (
        <span className="flex items-center gap-1 text-[9px] font-medium" style={{ color: partner.color }}>
          <span className="h-1 w-1 rounded-full" style={{ background: partner.color }} />
          與 {partner.personEn} 協同
        </span>
      )}
      {state === "waiting" && (
        <span className="rounded-full bg-amber-400/15 px-1.5 py-px text-[9px] font-medium text-amber-300">
          等待指示
        </span>
      )}
      {state === "ended" && (
        <span className="rounded-full bg-white/10 px-1.5 py-px text-[9px] font-medium text-white/50">已結束</span>
      )}
      {state === "completed" && (
        <span
          className="rounded-full px-1.5 py-px text-[9px] font-medium"
          style={{ background: `${color}22`, color }}
        >
          完成
        </span>
      )}
    </div>
  );
}

export default function FlowGraph({
  flow,
  color,
  live,
}: {
  flow: FlowColumn[];
  color: string;
  live?: LiveInfo | null;
}) {
  const match = live?.active ? findMatch(flow, live) : null;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-stretch justify-between gap-0 sm:min-w-0">
        {flow.map((col, ci) => (
          <div key={ci} className="flex flex-1 items-center">
            {ci > 0 && (
              <span
                className="mx-1 h-px w-3 shrink-0 self-center sm:mx-1.5 sm:w-full sm:min-w-3 sm:max-w-8"
                style={{
                  background:
                    live?.active && match && ci <= match.col ? color : "rgba(255,255,255,0.12)",
                }}
              />
            )}
            <div
              className={`flex flex-1 flex-col items-center justify-center ${
                col.nodes.length > 1 ? "gap-3" : ""
              }`}
            >
              {col.nodes.map((node) => (
                <NodeView
                  key={node.id}
                  node={node}
                  state={nodeState(node, ci, match, live)}
                  color={color}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
