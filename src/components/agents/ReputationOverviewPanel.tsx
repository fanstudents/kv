"use client";

import { ArrowDown, ArrowRight, ArrowUp, MessageSquareWarning } from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TrendChart from "@/components/agents/charts/TrendChart";
import StatTile from "@/components/agents/charts/StatTile";
import {
  REPUTATION_DEMO_COMPETITOR_MOVES,
  REPUTATION_DEMO_LATEST_NEGATIVE,
  REPUTATION_DEMO_MENTIONS,
  REPUTATION_DEMO_PLATFORMS,
  REPUTATION_DEMO_STATS,
  REPUTATION_DEMO_TREND,
} from "@/lib/reputation-demo";

const IMPACT_TONE: Record<string, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};
const IMPACT_LABEL: Record<string, string> = { high: "高影響", medium: "中影響", low: "低影響" };

const MENTION_SENTIMENT_TONE: Record<string, "success" | "danger" | "neutral"> = {
  positive: "success",
  negative: "danger",
  neutral: "neutral",
};

function sentimentColor(score: number) {
  if (score >= 65) return "#06C755";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

const TREND_ICON = { up: ArrowUp, down: ArrowDown, flat: ArrowRight };

// 輿情哨兵(Jay)用:多平台情緒分數示範——本週聲量/正評比例，各平台情緒分數橫條，
// 情緒趨勢圖，以及競品動向敵情彙整清單。
export default function ReputationOverviewPanel() {
  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">品牌口碑與聲量(近 7 天)</h2>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">示範資料</Badge>
          <span className="text-xs text-neutral-400">來源:多平台社群聆聽</span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="總聲量"
          value={REPUTATION_DEMO_STATS.totalMentions.toLocaleString("en-US")}
          delta={REPUTATION_DEMO_STATS.mentionsDelta}
          deltaSuffix="%"
          hint="較前 7 天"
        />
        <StatTile
          label="正面評價比例"
          value={`${REPUTATION_DEMO_STATS.positiveRatio}%`}
          delta={REPUTATION_DEMO_STATS.positiveRatioDelta}
          deltaSuffix="pt"
          hint="較前 7 天"
        />
        <StatTile label="待處理負評" value={`${REPUTATION_DEMO_STATS.pendingNegative}`} />
      </div>

      <p className="mb-2 text-xs font-medium text-neutral-500">情緒聲量趨勢(近 7 天)</p>
      <TrendChart
        data={REPUTATION_DEMO_TREND}
        xKey="date"
        series={[
          { key: "positive", name: "正面", color: "#06C755" },
          { key: "negative", name: "負面", color: "#EF4444" },
        ]}
      />

      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-neutral-500">各平台情緒分數(0–100，越高越正面)</p>
        <ul className="space-y-2.5">
          {REPUTATION_DEMO_PLATFORMS.map((p) => {
            const TrendIcon = TREND_ICON[p.trend];
            return (
              <li key={p.platform}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                    {p.platform}
                    <TrendIcon
                      size={11}
                      className={
                        p.trend === "up" ? "text-[#06C755]" : p.trend === "down" ? "text-red-400" : "text-neutral-400"
                      }
                    />
                  </span>
                  <span className="shrink-0 text-neutral-400">
                    {p.mentions.toLocaleString("en-US")} 則 ·{" "}
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">{p.score}</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.score}%`, background: sentimentColor(p.score) }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-neutral-500">各平台聲量內容(IG／Threads／PTT／Facebook／Dcard)</p>
        <ul className="space-y-2">
          {REPUTATION_DEMO_MENTIONS.map((m, i) => (
            <li key={i} className="rounded-lg bg-neutral-50 px-3 py-2.5 text-xs dark:bg-neutral-900">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium text-neutral-700 dark:text-neutral-200">{m.platform}</span>
                <span className="text-neutral-400">{m.handle}</span>
                <Badge tone={MENTION_SENTIMENT_TONE[m.sentiment]}>
                  {m.sentiment === "positive" ? "正面" : m.sentiment === "negative" ? "負面" : "中立"}
                </Badge>
                <span className="ml-auto shrink-0 text-neutral-400">{m.time}</span>
              </div>
              <p className="leading-relaxed text-neutral-600 dark:text-neutral-300">「{m.quote}」</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-neutral-500">競品動向敵情彙整</p>
        <ul className="space-y-2">
          {REPUTATION_DEMO_COMPETITOR_MOVES.map((m, i) => (
            <li
              key={i}
              className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2.5 text-xs dark:bg-neutral-900"
            >
              <div className="min-w-0">
                <p className="font-medium text-neutral-700 dark:text-neutral-200">
                  {m.competitor}
                  <span className="ml-1.5 font-normal text-neutral-400">{m.date}</span>
                </p>
                <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{m.move}</p>
              </div>
              <Badge tone={IMPACT_TONE[m.impact]}>{IMPACT_LABEL[m.impact]}</Badge>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <MessageSquareWarning size={16} className="mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <span className="font-semibold">{REPUTATION_DEMO_LATEST_NEGATIVE.platform} 最新負評示範：</span>「
          {REPUTATION_DEMO_LATEST_NEGATIVE.excerpt}」建議回覆：{REPUTATION_DEMO_LATEST_NEGATIVE.suggestedReply}
        </p>
      </div>
    </Card>
  );
}
