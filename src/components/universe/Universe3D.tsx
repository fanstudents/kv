"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layers, Move3d, Network, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import Avatar from "@/components/agents/Avatar";
import BrandLogo from "@/components/integrations/BrandLogo";
import { AGENTS, agentTeam } from "@/lib/agent-data";
import { INTEGRATION_SEEDS } from "@/lib/integrations-data";
import { KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/knowledge-base-data";
import { AGENT_ACCESS_DEMO, KNOWLEDGE_DOMAINS, MARKETING_COLLAB_EDGES } from "@/lib/marketing-graph";
import type { AgentSlug } from "@/lib/types";

// 節點宇宙的立體模式：把「Agent 彼此的網狀協作」與「底層知識庫的分級治理」放進同一個
// 3D 空間，讓人一次看懂整體架構——
//   · 中層是 Agent 星環（Team Lead 在正中心），彼此的協作連線就是資料實際流動的方向
//   · 上層是他們串接的外部服務（GA4、Meta、LINE…）
//   · 下層是四層「平行」的知識庫：等大、等距，不做成漏斗——因為分級治理的規則是
//     「等級 ≤ 讀取上限就能讀」的門檻，不是包含關係；四層等重要，L4 也不該被畫得最小。
//     每位 Agent 往下插一根探針，插到自己的讀取上限為止，經過的每一層亮一顆點＝讀得到，
//     沒插到的層就是空的。數探針上有幾顆點，就知道這位 Agent 能讀到第幾級。
//
// 沒有引入 3D 函式庫：世界座標自己做 yaw/pitch 旋轉與透視投影，線用 SVG、節點用 HTML
// 疊上去，依深度排序與淡化。這樣可以直接沿用專案既有的頭像、品牌 logo 與配色元件。

const CAM_Z = 760; // 相機距離
const FOV = 820;

const AGENT_R = 350; // Agent 星環半徑
/** 整個結構的重心（服務在上、知識庫在下）往上補正，畫面才不會整團偏下 */
const WORLD_Y_OFFSET = 190;
// 服務環比 Agent 星環小、而且吊得更高：小環＋高懸，投影後不會跟星環穿插，
// 讀起來就是「一頂懸在團隊上方的服務冠冕」，連線也短，不再橫跨整個畫面。
const SOURCE_R = 260;
const SOURCE_Y = -430; // 服務層高度（負值＝上方）
/** 四層平行知識庫：等大、等距（誰能讀是規則問題，不是大小問題）。
 * 層距要大於盤面投影後的高度（約 2R·sin(俯角)），四層才不會糊成一團。 */
const PLATE_R = 190;
const PLATE_TOP = 215;
const PLATE_GAP = 200;
function plateY(level: KnowledgeLevel): number {
  return PLATE_TOP + (level - 1) * PLATE_GAP;
}
/** 探針從 Agent 往下插進盤面的水平收斂比例（要落在盤內才看得出插進哪一層） */
const PROBE_INSET = (PLATE_R * 0.8) / AGENT_R;

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Projected {
  x: number;
  y: number;
  /** 透視縮放：越近越大 */
  k: number;
  /** 旋轉後的深度，用來排序與淡化 */
  depth: number;
}

export type UniverseSelection =
  | { kind: "agent"; slug: AgentSlug }
  | { kind: "source"; id: string }
  | { kind: "level"; level: KnowledgeLevel }
  | null;

function ringPos(i: number, n: number, radius: number, y: number, phase = -90): Vec3 {
  const angle = ((phase + (360 / Math.max(1, n)) * i) * Math.PI) / 180;
  return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
}

function circularMeanDeg(anglesDeg: number[]): number {
  if (anglesDeg.length === 0) return 0;
  const rad = anglesDeg.map((a) => (a * Math.PI) / 180);
  const s = rad.reduce((acc, r) => acc + Math.sin(r), 0);
  const c = rad.reduce((acc, r) => acc + Math.cos(r), 0);
  return (Math.atan2(s, c) * 180) / Math.PI;
}

export default function Universe3D({
  marketingMode,
  selection,
  onSelect,
}: {
  marketingMode: boolean;
  selection: UniverseSelection;
  onSelect: (s: UniverseSelection) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 640 });
  const [yaw, setYaw] = useState(24);
  const [pitch, setPitch] = useState(32);
  const [zoom, setZoom] = useState(0.72);
  const [spin, setSpin] = useState(true);
  const [layers, setLayers] = useState({ agents: true, sources: true, knowledge: true });
  // 滑過就預覽關係、點下去才鎖定：預設畫面保持安靜，指到誰才把那條路徑點亮
  const [hover, setHover] = useState<UniverseSelection>(null);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  // 舞台尺寸
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 自動繞行（拖曳中或使用者關閉時停止；尊重 prefers-reduced-motion）
  useEffect(() => {
    if (!spin) return;
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!dragRef.current) setYaw((y) => (y + dt * 0.006) % 360);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spin]);

  // ── 世界座標（跟旋轉無關，只在資料變動時重算）──
  const world = useMemo(() => {
    const ringAgents = (marketingMode ? AGENTS.filter((a) => agentTeam(a.slug) === "marketing") : AGENTS).filter(
      (a) => marketingMode || a.slug !== "teamlead"
    );

    const agentPos = new Map<AgentSlug, Vec3 & { angle: number }>();
    if (!marketingMode) agentPos.set("teamlead", { x: 0, y: 0, z: 0, angle: 0 });
    ringAgents.forEach((a, i) => {
      const angle = -90 + (360 / ringAgents.length) * i;
      const p = ringPos(i, ringAgents.length, AGENT_R, 0);
      agentPos.set(a.slug, { ...p, angle });
    });

    const visibleAgents = marketingMode ? ringAgents : AGENTS;

    // 服務：落在使用它的 Agent 的平均角度方向、更外圈也更高
    const sourceEdges = INTEGRATION_SEEDS.flatMap((src) =>
      src.uses
        .filter((u) => agentPos.has(u.agent))
        .map((u) => ({ agent: u.agent, sourceId: src.id, connected: src.status === "connected" }))
    );
    const usedIds = new Set(sourceEdges.map((e) => e.sourceId));
    const sources = INTEGRATION_SEEDS.filter((s) => !marketingMode || usedIds.has(s.id));
    // 服務落在「使用它的那幾位 Agent」的平均方位，但幾個服務常常擠在同一個方向（大家都用
    // LINE、GA4…），標籤會疊成一團。排序後強制拉開最小角距，並交錯半徑，讀起來才清楚。
    const sourcePos = new Map<string, Vec3>();
    const placedSources = sources
      .map((src) => ({ id: src.id, angle: circularMeanDeg(src.uses.map((u) => agentPos.get(u.agent)?.angle ?? 0)) }))
      .sort((a, b) => a.angle - b.angle);
    // 依「使用它的 Agent 的平均方位」排好序，再等角平均攤開：順序仍然對得上使用者，
    // 但每個 logo 之間的距離一致，冠冕看起來是整齊的一圈而不是幾團擠在一起。
    const step = 360 / Math.max(1, placedSources.length);
    const base = placedSources[0]?.angle ?? 0;
    placedSources.forEach((s, i) => {
      s.angle = base + i * step;
      const rad = (s.angle * Math.PI) / 180;
      // 全部落在同一個乾淨的圓環上（不再交錯高低半徑）——名稱預設收起來，
      // 沒有標籤要閃避，服務層就能是一圈整齊的 logo。
      sourcePos.set(s.id, { x: Math.cos(rad) * SOURCE_R, y: SOURCE_Y, z: Math.sin(rad) * SOURCE_R });
    });

    // 知識庫：四層平行盤面。主題標籤不固定在盤上，而是每次繪製時排在「面向鏡頭的前緣」，
    // 這樣上一層永遠不會蓋住下一層的字（見下方 topicPos）。
    const plates = KNOWLEDGE_LEVELS.map((lv) => ({
      info: lv,
      y: plateY(lv.level),
      r: PLATE_R,
      topics: KNOWLEDGE_DOMAINS.find((d) => d.level === lv.level)?.topics ?? [],
      center: { x: 0, y: plateY(lv.level), z: 0 } as Vec3,
      readers: visibleAgents.filter((a) => (AGENT_ACCESS_DEMO[a.slug] ?? 1) >= lv.level),
    }));

    // Agent ↔ Agent：Team Lead 彙整全隊、約拜訪與行程助理共用日曆、行銷戰隊互聯
    const agentEdges: { a: AgentSlug; b: AgentSlug; flow?: string; strong?: boolean }[] = [];
    if (!marketingMode) {
      ringAgents.forEach((a) => agentEdges.push({ a: "teamlead", b: a.slug, flow: "每日動態彙整" }));
      agentEdges.push({ a: "visit", b: "schedule", flow: "共用同一份 Google 日曆", strong: true });
    }
    MARKETING_COLLAB_EDGES.filter((e) => agentPos.has(e.from) && agentPos.has(e.to)).forEach((e) =>
      agentEdges.push({ a: e.from, b: e.to, flow: e.flow, strong: true })
    );

    // Agent ↔ 知識庫：一位 Agent 一根探針，從他的位置直直往下插到自己的讀取上限那一層。
    // 探針經過的每一層都在交會點亮一顆該層顏色的點＝這一級讀得到。
    const probes = visibleAgents.map((a) => {
      const from = agentPos.get(a.slug) ?? { x: 0, y: 0, z: 0 };
      const cap = (AGENT_ACCESS_DEMO[a.slug] ?? 1) as KnowledgeLevel;
      const to: Vec3 = { x: from.x * PROBE_INSET, y: plateY(cap), z: from.z * PROBE_INSET };
      const hits = KNOWLEDGE_LEVELS.filter((lv) => lv.level <= cap).map((lv) => {
        const t = to.y === from.y ? 1 : (plateY(lv.level) - from.y) / (to.y - from.y);
        return {
          level: lv.level,
          color: lv.color,
          pos: {
            x: from.x + (to.x - from.x) * t,
            y: plateY(lv.level),
            z: from.z + (to.z - from.z) * t,
          } as Vec3,
        };
      });
      return { agent: a.slug, color: a.color, cap, from: from as Vec3, to, hits };
    });

    return { visibleAgents, agentPos, sources, sourcePos, sourceEdges, plates, agentEdges, probes };
  }, [marketingMode]);

  // ── 投影：yaw 繞 Y 軸、pitch 繞 X 軸，再做透視 ──
  const project = useCallback(
    (p: Vec3): Projected => {
      const yr = (yaw * Math.PI) / 180;
      const pr = (pitch * Math.PI) / 180;
      const py = p.y - WORLD_Y_OFFSET;
      const x1 = p.x * Math.cos(yr) - p.z * Math.sin(yr);
      const z1 = p.x * Math.sin(yr) + p.z * Math.cos(yr);
      const y2 = py * Math.cos(pr) - z1 * Math.sin(pr);
      const z2 = py * Math.sin(pr) + z1 * Math.cos(pr);
      const k = (FOV / (FOV + z2 + CAM_Z)) * zoom;
      // 座標固定精度：伺服器端與瀏覽器端的三角函數在最後幾位可能有微小差異，
      // 不四捨五入的話 SSR 輸出與 hydration 對不起來（會噴 hydration mismatch）。
      const r2 = (n: number) => Math.round(n * 100) / 100;
      return {
        x: r2(size.w / 2 + x1 * k),
        // 往下推一點：上方要留給工具列，不然服務層會被切掉
        y: r2(size.h / 2 + y2 * k + 42),
        k: Math.round(k * 1000) / 1000,
        depth: r2(z2),
      };
    },
    [yaw, pitch, zoom, size.w, size.h]
  );

  // ── 指到（或選到）誰，就點亮跟他有關的那一組 ──
  const focus = selection ?? hover;
  const highlight = useMemo(() => {
    const agents = new Set<AgentSlug>();
    const sources = new Set<string>();
    const levels = new Set<KnowledgeLevel>();
    if (!focus) return null;
    const selection = focus;

    if (selection.kind === "agent") {
      agents.add(selection.slug);
      world.agentEdges.forEach((e) => {
        if (e.a === selection.slug) agents.add(e.b);
        if (e.b === selection.slug) agents.add(e.a);
      });
      world.sourceEdges.forEach((e) => {
        if (e.agent === selection.slug) sources.add(e.sourceId);
      });
      const cap = AGENT_ACCESS_DEMO[selection.slug] ?? 1;
      KNOWLEDGE_LEVELS.forEach((lv) => {
        if (lv.level <= cap) levels.add(lv.level);
      });
    } else if (selection.kind === "source") {
      sources.add(selection.id);
      world.sourceEdges.forEach((e) => {
        if (e.sourceId === selection.id) agents.add(e.agent);
      });
    } else {
      levels.add(selection.level);
      world.visibleAgents.forEach((a) => {
        if ((AGENT_ACCESS_DEMO[a.slug] ?? 1) >= selection.level) agents.add(a.slug);
      });
    }
    return { agents, sources, levels };
  }, [focus, world]);

  const agentDim = (slug: AgentSlug) => Boolean(highlight && !highlight.agents.has(slug));
  const sourceDim = (id: string) => Boolean(highlight && !highlight.sources.has(id));
  const levelDim = (lv: KnowledgeLevel) => Boolean(highlight && !highlight.levels.has(lv));

  // 拖曳旋轉
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    // 一動手就停止自轉：要指著某個節點講解時，畫面別再自己跑（右上角可重新開啟）
    setSpin(false);
    dragRef.current = { x: e.clientX, y: e.clientY, yaw, pitch };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setYaw(d.yaw + (e.clientX - d.x) * 0.35);
    // 俯角不讓人壓到太平：太平的話 Agent 星環會塌成一條線、頭像互相重疊
    setPitch(Math.max(18, Math.min(70, d.pitch - (e.clientY - d.y) * 0.25)));
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const projAgents = world.visibleAgents
    .map((a) => ({ agent: a, pos: world.agentPos.get(a.slug), proj: project(world.agentPos.get(a.slug) ?? { x: 0, y: 0, z: 0 }) }))
    .filter((x) => x.pos);

  return (
    <div className="relative">
      {/* 控制列 */}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        {(
          [
            { key: "agents", label: "Agent 協作網", icon: Network },
            { key: "sources", label: "服務串接", icon: Move3d },
            { key: "knowledge", label: "知識庫分級", icon: Layers },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
              layers[key] ? "bg-white/10 text-white/70" : "text-white/25 hover:text-white/50"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button
          type="button"
          onClick={() => setSpin((s) => !s)}
          title={spin ? "停止自轉" : "開始自轉"}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            spin ? "bg-white/10 text-white/60" : "text-white/25 hover:text-white/50"
          }`}
        >
          <RotateCw size={13} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
          title="放大"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          title="縮小"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
        >
          <ZoomOut size={13} />
        </button>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={(e) => setZoom((z) => Math.max(0.6, Math.min(2.2, z - e.deltaY * 0.0012)))}
        className="relative h-[calc(100vh-220px)] min-h-[520px] w-full cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
      >
        {/* 連線與圓盤 */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {/* 知識庫圓盤（投影成傾斜的橢圓多邊形，跟著旋轉） */}
          {layers.knowledge &&
            world.plates.map((plate) => {
              const pts = Array.from({ length: 48 }, (_, i) => {
                const a = (i / 48) * Math.PI * 2;
                return project({ x: Math.cos(a) * plate.r, y: plate.y, z: Math.sin(a) * plate.r });
              });
              const dim = levelDim(plate.info.level);
              return (
                <g key={`plate-${plate.info.level}`} opacity={dim ? 0.22 : 1}>
                  <polygon
                    points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill={`${plate.info.color}14`}
                    stroke={plate.info.color}
                    strokeWidth={1.2}
                    strokeOpacity={0.65}
                  />
                </g>
              );
            })}

          {/* Agent 星環的軌道線 */}
          {layers.agents && (
            <polygon
              points={Array.from({ length: 60 }, (_, i) => {
                const a = (i / 60) * Math.PI * 2;
                const p = project({ x: Math.cos(a) * AGENT_R, y: 0, z: Math.sin(a) * AGENT_R });
                return `${p.x},${p.y}`;
              }).join(" ")}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          )}

          {/* Agent ↔ Agent 協作 */}
          {layers.agents &&
            world.agentEdges.map((e, i) => {
              const a = world.agentPos.get(e.a);
              const b = world.agentPos.get(e.b);
              if (!a || !b) return null;
              const pa = project(a);
              const pb = project(b);
              // 沒有指到任何節點時，所有線都收在同一個極淡的中性色——畫面先給人結構感，
              // 而不是四十幾條彩色線同時搶注意力；指到誰，才把他那幾條用他的顏色點亮。
              const lit = Boolean(highlight && highlight.agents.has(e.a) && highlight.agents.has(e.b));
              const color = AGENTS.find((x) => x.slug === e.a)?.color ?? "#818cf8";
              return (
                <line
                  key={`ae-${i}`}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={lit ? color : "#ffffff"}
                  strokeWidth={lit ? 1.6 : 1}
                  strokeOpacity={lit ? 0.65 : highlight ? 0.03 : e.strong ? 0.1 : 0.05}
                  strokeDasharray={e.strong ? "5 7" : undefined}
                  className={lit ? "u3d-flow" : undefined}
                />
              );
            })}

          {/* Agent ↔ 服務 */}
          {layers.sources &&
            world.sourceEdges.map((e, i) => {
              const a = world.agentPos.get(e.agent);
              const b = world.sourcePos.get(e.sourceId);
              if (!a || !b) return null;
              const pa = project(a);
              const pb = project(b);
              const lit = Boolean(
                highlight && highlight.agents.has(e.agent) && highlight.sources.has(e.sourceId)
              );
              return (
                <line
                  key={`se-${i}`}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={lit ? "#38bdf8" : "#ffffff"}
                  strokeWidth={1}
                  strokeOpacity={lit ? 0.5 : highlight ? 0.03 : 0.06}
                  strokeDasharray={e.connected ? "4 6" : "2 4"}
                  className={lit && e.connected ? "u3d-flow" : undefined}
                />
              );
            })}

          {/* 存取規則：一位 Agent 一根探針，插到自己的讀取上限為止；
              經過的每一層在交會點亮一顆該層顏色的點＝這一級讀得到。數點就知道權限。 */}
          {layers.knowledge &&
            world.probes.map((probe) => {
              // 探針的線只是「路徑」，資訊在那幾顆點上——所以線壓到很淡，點維持飽和。
              const lit = Boolean(highlight && highlight.agents.has(probe.agent));
              const dim = Boolean(highlight && !lit);
              const pa = project(probe.from);
              const pb = project(probe.to);
              return (
                <g key={`probe-${probe.agent}`} opacity={dim ? 0.1 : 1}>
                  <line
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke={lit ? probe.color : "#ffffff"}
                    strokeWidth={lit ? 1.3 : 1}
                    strokeOpacity={lit ? 0.55 : 0.12}
                    strokeDasharray="3 6"
                    className={lit ? "u3d-flow" : undefined}
                  />
                  {probe.hits.map((hit) => {
                    const p = project(hit.pos);
                    const levelDimmed = Boolean(highlight && !highlight.levels.has(hit.level));
                    return (
                      <circle
                        key={`probe-${probe.agent}-${hit.level}`}
                        cx={p.x}
                        cy={p.y}
                        r={Math.max(2.2, (lit ? 4.4 : 3.4) * p.k)}
                        fill={hit.color}
                        opacity={levelDimmed ? 0.2 : lit ? 1 : 0.85}
                      />
                    );
                  })}
                </g>
              );
            })}
        </svg>

        {/* 知識庫層標籤與主題節點 */}
        {layers.knowledge &&
          world.plates.map((plate) => {
            const dim = levelDim(plate.info.level);
            // 等級標籤固定貼在畫面左緣、只跟著該層的高度上下移動（跟著旋轉會撞到節點）
            const labelPos = project(plate.center);
            const eligible = plate.readers;
            const showTopics = selection?.kind === "level" && selection.level === plate.info.level;
            // 主題排在「面向鏡頭的前緣」：世界角度 φ 投影後最靠近鏡頭的是 φ = -90 - yaw，
            // 以它為中心攤開一段弧，四層的字就永遠落在各自盤面的近端、不會互相遮蓋。
            const frontDeg = -90 - yaw;
            const spread = 132;
            return (
              <div key={`plabel-${plate.info.level}`}>
                <button
                  type="button"
                  onClick={() =>
                    onSelect(
                      selection?.kind === "level" && selection.level === plate.info.level
                        ? null
                        : { kind: "level", level: plate.info.level }
                    )
                  }
                  onMouseEnter={() => setHover({ kind: "level", level: plate.info.level })}
                  onMouseLeave={() => setHover(null)}
                  className="absolute flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur transition-opacity"
                  style={{
                    left: 12,
                    top: labelPos.y,
                    opacity: dim ? 0.35 : 1,
                    borderColor: `${plate.info.color}66`,
                    background: `${plate.info.color}22`,
                    color: "#fff",
                    zIndex: 6,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: plate.info.color }} />
                  {plate.info.label}
                  <span className="font-normal text-white/55">
                    {eligible.length}/{world.visibleAgents.length} 位可讀
                  </span>
                </button>

                {/* 主題內容預設收起來（畫面先講清楚「誰能讀到第幾層」這條規則），
                    點某一層才把那一層裝什麼攤開在盤面前緣 */}
                {showTopics &&
                  plate.topics.map((label, i, arr) => {
                  const deg = frontDeg - spread / 2 + (spread / Math.max(1, arr.length - 1)) * i;
                  const rad = (deg * Math.PI) / 180;
                  const reach = i % 2 === 0 ? 0.72 : 1.05;
                  const p = project({
                    x: Math.cos(rad) * plate.r * reach,
                    y: plate.y,
                    z: Math.sin(rad) * plate.r * reach,
                  });
                  return (
                    <span
                      key={`${plate.info.level}-${label}`}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px]"
                      style={{
                        left: p.x,
                        top: p.y,
                        opacity: dim ? 0.15 : 0.95,
                        color: "#fff",
                        background: `${plate.info.color}2b`,
                        border: `1px solid ${plate.info.color}55`,
                        transform: `translate(-50%,-50%) scale(${Math.max(0.6, p.k)})`,
                        zIndex: 4,
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            );
          })}

        {/* 服務節點 */}
        {layers.sources &&
          world.sources.map((src) => {
            const pos = world.sourcePos.get(src.id);
            if (!pos) return null;
            const p = project(pos);
            const dim = sourceDim(src.id);
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => onSelect(selection?.kind === "source" && selection.id === src.id ? null : { kind: "source", id: src.id })}
                onMouseEnter={() => setHover({ kind: "source", id: src.id })}
                onMouseLeave={() => setHover(null)}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-opacity"
                style={{
                  left: p.x,
                  top: p.y,
                  opacity: dim ? 0.18 : 1,
                  transform: `translate(-50%,-50%) scale(${Math.max(0.55, p.k)})`,
                  zIndex: Math.round(1000 - p.depth),
                }}
              >
                <span
                  className="rounded-2xl"
                  style={{ boxShadow: dim || src.status !== "connected" ? "none" : `0 0 16px -3px ${src.color}` }}
                >
                  <BrandLogo brand={src.icon} name={src.name} color={src.color} size={34} />
                </span>
                {/* 名稱只有指到才出現：八個服務名同時掛在畫面上太吵，logo 本身已經認得出來 */}
                {(focus?.kind === "source" && focus.id === src.id) ||
                (highlight?.sources.has(src.id) ?? false) ? (
                  <span className="whitespace-nowrap text-[10px] text-white/70">{src.name}</span>
                ) : null}
              </button>
            );
          })}

        {/* Agent 節點（依深度排序，前面的蓋住後面的） */}
        {layers.agents &&
          projAgents.map(({ agent, proj: p }) => {
            const isCenter = agent.slug === "teamlead" && !marketingMode;
            const dim = agentDim(agent.slug);
            const cap = AGENT_ACCESS_DEMO[agent.slug] ?? 1;
            const capColor = KNOWLEDGE_LEVELS[cap - 1].color;
            return (
              <button
                key={agent.slug}
                type="button"
                onClick={() =>
                  onSelect(selection?.kind === "agent" && selection.slug === agent.slug ? null : { kind: "agent", slug: agent.slug })
                }
                onMouseEnter={() => setHover({ kind: "agent", slug: agent.slug })}
                onMouseLeave={() => setHover(null)}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-opacity"
                style={{
                  left: p.x,
                  top: p.y,
                  opacity: dim ? 0.2 : 1,
                  transform: `translate(-50%,-50%) scale(${Math.max(0.55, p.k)})`,
                  zIndex: Math.round(1000 - p.depth),
                }}
              >
                <span className="relative" style={{ boxShadow: dim ? "none" : `0 0 ${isCenter ? 28 : 18}px -4px ${agent.color}`, borderRadius: 9999 }}>
                  <Avatar personEn={agent.personEn} color={agent.color} size={isCenter ? 66 : 48} />
                  {/* 知識庫讀取上限：頭像右下角一顆等級小點 */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ring-2 ring-[#03040a]"
                    style={{ background: capColor }}
                    title={`知識庫讀取上限 ${KNOWLEDGE_LEVELS[cap - 1].label}`}
                  >
                    {cap}
                  </span>
                </span>
                <span className="whitespace-nowrap text-[11px] font-medium text-white/85">{agent.personEn}</span>
              </button>
            );
          })}


      </div>

      {/* 底部一行把「這張圖在講什麼」與「怎麼操作」講完，不再分兩排文字 */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[10px] text-white/30">
        <span>上層 服務 · 中層 Agent · 下層 四級知識庫</span>
        <span className="text-white/20">探針插到哪一層，就讀得到哪一層</span>
        <span className="text-white/20">滑過看關係 · 拖曳旋轉 · 滾輪縮放</span>
      </div>
    </div>
  );
}
