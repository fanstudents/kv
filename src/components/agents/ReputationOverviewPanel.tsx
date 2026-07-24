"use client";

import { ArrowDown, ArrowRight, ArrowUp, MessageSquareWarning } from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TrendChart from "@/components/agents/charts/TrendChart";
import StatTile from "@/components/agents/charts/StatTile";
import {
  REPUTATION_DEMO_COMPETITOR_MOVES,
  REPUTATION_DEMO_COMPETITOR_SENTIMENT,
  REPUTATION_DEMO_EMOTION_MIX,
  REPUTATION_DEMO_KEYWORDS,
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

// 輿情哨兵(Jay)用:以情緒分數為主軸——綜合情緒溫度、情緒組成、各平台情緒分數與內容、
// 情緒關鍵詞、競品情緒對比與敵情彙整。
export default function ReputationOverviewPanel() {
  const maxCompetitor = Math.max(...REPUTATION_DEMO_COMPETITOR_SENTIMENT.map((c) => c.score));

  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">品牌口碑與情緒分析(近 7 天)</h2>
        <span className="text-xs text-neutral-400">來源:多平台社群聆聽</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="綜合情緒溫度"
          value={`${REPUTATION_DEMO_STATS.sentimentScore}°`}
          delta={REPUTATION_DEMO_STATS.sentimentDelta}
          hint="0–100，越高越正面"
        />
        <StatTile
          label="總聲量"
          value={REPUTATION_DEMO_STATS.totalMentions.toLocaleString("en-US")}
          delta={REPUTATION_DEMO_STATS.mentionsDelta}
          deltaSuffix="%"
          hint="較前 7 天"
        />
        <StatTile
          label="淨情緒值"
          value={`+${REPUTATION_DEMO_STATS.netSentiment}`}
          hint="正面% − 負面%"
        />
        <StatTile label="待處理負評" value={`${REPUTATION_DEMO_STATS.pendingNegative}`} />
      </div>

      {/* 情緒組成:一條堆疊長條 */}
      <p className="mb-2 text-xs font-medium text-neutral-500">情緒組成</p>
      <div className="mb-1.5 flex h-3 overflow-hidden rounded-full">
        <div style={{ width: `${REPUTATION_DEMO_EMOTION_MIX.positive}%`, background: "#06C755" }} />
        <div style={{ width: `${REPUTATION_DEMO_EMOTION_MIX.neutral}%`, background: "#94A3B8" }} />
        <div style={{ width: `${REPUTATION_DEMO_EMOTION_MIX.negative}%`, background: "#EF4444" }} />
      </div>
      <div className="mb-5 flex gap-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#06C755]" />正面 {REPUTATION_DEMO_EMOTION_MIX.positive}%</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#94A3B8]" />中立 {REPUTATION_DEMO_EMOTION_MIX.neutral}%</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EF4444]" />負面 {REPUTATION_DEMO_EMOTION_MIX.negative}%</span>
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
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">{p.score}°</span>
                  </span>
                </div>
                {/* 情緒組成堆疊條 */}
                <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div style={{ width: `${p.positive}%`, background: "#06C755" }} />
                  <div style={{ width: `${p.neutral}%`, background: "#94A3B8" }} />
                  <div style={{ width: `${p.negative}%`, background: "#EF4444" }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-neutral-500">情緒關鍵詞(大家在稱讚／抱怨什麼)</p>
        <div className="flex flex-wrap gap-2">
          {REPUTATION_DEMO_KEYWORDS.map((k) => (
            <span
              key={k.word}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: k.sentiment === "positive" ? "#06C7551A" : "#EF44441A",
                color: k.sentiment === "positive" ? "#06C755" : "#EF4444",
              }}
            >
              {k.word}
              <span className="text-[10px] opacity-70">{k.count}</span>
            </span>
          ))}
        </div>
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
                  {m.sentiment === "positive" ? "正面" : m.sentiment === "negative" ? "負面" : "中立"} {m.score}°
                </Badge>
                <span className="ml-auto shrink-0 text-neutral-400">{m.time}</span>
              </div>
              <p className="leading-relaxed text-neutral-600 dark:text-neutral-300">「{m.quote}」</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-neutral-500">競品情緒對比(綜合情緒溫度)</p>
        <ul className="space-y-2.5">
          {REPUTATION_DEMO_COMPETITOR_SENTIMENT.map((c) => (
            <li key={c.brand}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className={`${c.isOwn ? "font-semibold text-neutral-800 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-300"}`}>
                  {c.brand}
                  {c.isOwn && <span className="ml-1.5 rounded-full bg-[#D946EF]/15 px-1.5 py-0.5 text-[10px] text-[#D946EF]">我方</span>}
                </span>
                <span className="shrink-0 text-neutral-400">
                  {c.mentions.toLocaleString("en-US")} 則 ·{" "}
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{c.score}°</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(c.score / maxCompetitor) * 100}%`, background: c.isOwn ? "#D946EF" : sentimentColor(c.score) }}
                />
              </div>
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
          <span className="font-semibold">{REPUTATION_DEMO_LATEST_NEGATIVE.platform} 最新負評：</span>「
          {REPUTATION_DEMO_LATEST_NEGATIVE.excerpt}」建議回覆：{REPUTATION_DEMO_LATEST_NEGATIVE.suggestedReply}
        </p>
      </div>
    </Card>
  );
}
