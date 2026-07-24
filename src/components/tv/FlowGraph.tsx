"use client";

import { Check } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import BrandLogo from "@/components/integrations/BrandLogo";
import { AGENTS } from "@/lib/agent-data";
import type { FlowColumn, FlowNode } from "@/lib/agent-briefings";
import type { LiveInfo } from "./LiveTask";

// 每位 Agent 的工作流程圖：主幹 + 分支（一欄多節點＝擇一走向）。
// 待命時整張圖以中性狀態展示（讓人看得懂這位 Agent 的完整流程）；
// 有真實任務時，依 live 進度把走過的節點打勾、目前節點放大呼吸、未走的分支淡出。
//
// 資料流向的畫法：單節點欄之間是一條有箭頭的直線；只要銜接的一端是「多節點分支欄」，
// 改畫一條「幹線」——幹線本身貼在分支欄自己的容器邊緣（inset-y-0，容器是 intrinsic
// 高度，不被同一列的其他欄拉伸，天然就等於這一欄節點群的實際高度），每個節點再各自
// 拉一段小支線接到幹線；直線＋幹線的組合讓人一眼看出「一條路進來、往哪幾條路散開」。

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

/** 這個節點在目前狀態下的「路徑線色」——已走過或現在中的路徑用品牌色，其餘半透明白 */
function pathColor(state: NodeState, color: string): string {
  if (state === "done" || state === "completed" || state === "active" || state === "waiting") return color;
  return "rgba(255,255,255,0.14)";
}

function NodeView({ node, state, color }: { node: FlowNode; state: NodeState; color: string }) {
  const isCurrent = state === "active" || state === "waiting";
  const dot = state === "waiting" ? "#F59E0B" : color;
  const size = isCurrent ? 28 : 18;
  // 這一步實際上跟另一位 Agent 協同（例如查的是同一份真實行事曆），
  // 疊一顆對方小頭像做視覺連通，而不是假裝這只是自己一個人的步驟。
  const partner = node.handoff ? AGENTS.find((a) => a.slug === node.handoff) : undefined;

  const ringColor =
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
              : "rgba(255,255,255,0.16)";

  // 這一步實際上是呼叫外部 app（LINE / Google 日曆 / Gmail…）：圓圈改用白底裝真實 logo，
  // 進度改以角落小徽章表示，而不是把品牌色塗滿整顆圓（那樣會蓋掉 logo 本身的顏色）。
  const circleStyle: React.CSSProperties = node.app
    ? {
        width: size,
        height: size,
        borderColor: ringColor,
        background: "rgba(255,255,255,0.94)",
        boxShadow: isCurrent ? `0 0 16px -2px ${dot}` : "none",
      }
    : {
        width: size,
        height: size,
        borderColor: ringColor,
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
      {/* 分支標籤固定保留高度(即使沒有也留白)：讓同一欄每個節點的圓圈落在同一條水平線上，
          小支線／幹線才能穩定對齊，不用去量每個節點的實際渲染高度。 */}
      <span
        className="flex h-4 items-center rounded-full px-1.5 text-[9px] font-medium leading-tight"
        style={{
          visibility: node.branch ? "visible" : "hidden",
          background: isCurrent ? `${dot}22` : "rgba(255,255,255,0.07)",
          color: isCurrent ? dot : "rgba(255,255,255,0.45)",
        }}
      >
        {node.branch ?? "·"}
      </span>
      <span className="relative flex shrink-0 items-center justify-center">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border-2 transition-all ${isCurrent ? "tv-breathe" : ""}`}
          style={circleStyle}
        >
          {node.app ? (
            <BrandLogo brand={node.app} name={node.label} color={color} size={Math.max(size - 8, 10)} bare />
          ) : (
            <>
              {(state === "done" || state === "completed") && (
                <Check size={11} className="text-[#05060a]" strokeWidth={3} />
              )}
              {isCurrent && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
              {state === "ended" && <span className="h-1.5 w-1.5 rounded-full bg-[#05060a]" />}
            </>
          )}
        </span>
        {/* logo 節點的進度徽章：品牌色已經被 logo 佔用，改在右下角疊一顆小圓點表示走到哪 */}
        {node.app && (state === "done" || state === "completed") && (
          <span
            className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-[#0b0d12]"
            style={{ background: color }}
          >
            <Check size={8} className="text-[#05060a]" strokeWidth={3} />
          </span>
        )}
        {node.app && isCurrent && (
          <span
            className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-[#0b0d12]"
            style={{ background: dot }}
          />
        )}
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

/** 單節點對單節點：一條直線，尾端一個小箭頭標出流向 */
function StraightConnector({ lineColor }: { lineColor: string }) {
  return (
    <span className="flex shrink-0 items-center self-center px-0.5 sm:px-1">
      <span className="h-px w-3 sm:w-full sm:min-w-3 sm:max-w-8" style={{ background: lineColor }} />
      <span
        className="h-0 w-0 shrink-0 border-y-[3px] border-l-[5px] border-y-transparent"
        style={{ borderLeftColor: lineColor }}
      />
    </span>
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
  const isLive = Boolean(live?.active && match);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-5">
      <div className="flex min-w-max items-center justify-between gap-0 sm:min-w-0">
        {flow.map((col, ci) => {
          const isBranch = col.nodes.length > 1;
          const prevBranch = ci > 0 && flow[ci - 1].nodes.length > 1;
          // 這一欄與上一欄之間的路徑，已經走過就用品牌色，否則半透明白
          const enteredColor =
            isLive && match && ci <= match.col ? color : "rgba(255,255,255,0.14)";

          return (
            <div key={ci} className="flex flex-1 items-center">
              {ci > 0 && !isBranch && !prevBranch && <StraightConnector lineColor={enteredColor} />}
              {ci > 0 && (isBranch || prevBranch) && (
                // 銜接分支欄的一段：不畫獨立箭頭，直接讓短線接上分支欄自己的幹線
                <span className="h-px w-2.5 shrink-0 self-center sm:w-4" style={{ background: enteredColor }} />
              )}

              <div
                className={`relative flex flex-1 flex-col items-center justify-center ${
                  isBranch ? "max-w-[9rem] gap-3 px-1" : ""
                }`}
              >
                {/* 幹線：貼著這欄節點群自己的邊界(intrinsic 高度，不被同列其他欄拉伸)，
                    左側代表「多條路匯集進來」，右側代表「從這裡散開往多條路」 */}
                {isBranch && ci > 0 && (
                  <span className="absolute inset-y-0 left-0 w-px rounded-full" style={{ background: enteredColor }} />
                )}
                {isBranch && ci < flow.length - 1 && (
                  <span
                    className="absolute inset-y-0 right-0 w-px rounded-full"
                    style={{ background: isLive && match && ci < match.col ? color : "rgba(255,255,255,0.14)" }}
                  />
                )}

                {col.nodes.map((node) => {
                  const state = nodeState(node, ci, match, live);
                  const tickColor = pathColor(state, color);
                  return (
                    <div key={node.id} className="relative flex w-full justify-center">
                      {isBranch && ci > 0 && (
                        <span
                          className="absolute left-0 right-1/2 top-1/2 h-px -translate-y-1/2"
                          style={{ background: tickColor }}
                        />
                      )}
                      {isBranch && ci < flow.length - 1 && (
                        <span
                          className="absolute left-1/2 right-0 top-1/2 h-px -translate-y-1/2"
                          style={{ background: tickColor }}
                        />
                      )}
                      <NodeView node={node} state={state} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
