"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { getAgent, ACTIVITY_LOGS } from "@/lib/agent-data";
import AgentPageShell from "@/components/agents/AgentPageShell";
import { Field, TextInput, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

const agent = getAgent("competitor")!;

const SOURCE_OPTIONS = ["官網更新", "新聞報導", "徵才頁面", "產品口碑"];

interface Competitor {
  name: string;
  url: string;
}

// Sample intelligence feed — real monitoring needs a news/search data source
// (e.g. Google News RSS, a search API) which isn't connected yet.
const SAMPLE_FEED = [
  {
    competitor: "對手 A 教育",
    source: "官網更新",
    tag: "產品更新",
    impact: "高" as const,
    summary: "推出新版「AI 導入速成班」，主打 3 小時體驗課、價格較低。",
    action: "評估是否調整我們 AI 導入課程的定價與時長",
  },
  {
    competitor: "對手 B 顧問",
    source: "新聞報導",
    tag: "人事異動",
    impact: "中" as const,
    summary: "首席顧問離職，媒體報導內部組織調整。",
    action: "觀察既有客戶滿意度變化，必要時可主動接觸",
  },
  {
    competitor: "對手 A 教育",
    source: "徵才頁面",
    tag: "徵才擴編",
    impact: "中" as const,
    summary: "大量招募業務與講師，疑似擴大市場覆蓋。",
    action: "留意其業務是否開始接觸我們現有客戶",
  },
  {
    competitor: "對手 C 工作室",
    source: "產品口碑",
    tag: "負面口碑",
    impact: "低" as const,
    summary: "Google 評論出現客戶抱怨服務態度不佳。",
    action: "暫不需行動，持續觀察即可",
  },
];

const IMPACT_TONE: Record<string, "danger" | "warning" | "neutral"> = { 高: "danger", 中: "warning", 低: "neutral" };

export default function CompetitorAgentPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { name: "對手 A 教育", url: "https://competitor-a.example.com" },
    { name: "對手 B 顧問", url: "https://competitor-b.example.com" },
  ]);
  const [sources, setSources] = useState<string[]>(SOURCE_OPTIONS);
  const [digestFrequency, setDigestFrequency] = useState("daily");
  const [minImpactToNotify, setMinImpactToNotify] = useState("mid");

  const onSettingsLoaded = useCallback((s: Record<string, unknown>) => {
    if (Array.isArray(s.competitors)) setCompetitors(s.competitors as Competitor[]);
    if (Array.isArray(s.sources)) setSources(s.sources as string[]);
    if (typeof s.digestFrequency === "string") setDigestFrequency(s.digestFrequency);
    if (typeof s.minImpactToNotify === "string") setMinImpactToNotify(s.minImpactToNotify);
  }, []);

  const toggleSource = (s: string) => {
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const updateCompetitor = (i: number, field: keyof Competitor, value: string) => {
    setCompetitors((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const removeCompetitor = (i: number) => {
    setCompetitors((prev) => prev.filter((_, idx) => idx !== i));
  };

  const impactRank = { 高: 3, 中: 2, 低: 1 };
  const threshold = minImpactToNotify === "high" ? 3 : minImpactToNotify === "mid" ? 2 : 1;
  const flagged = SAMPLE_FEED.filter((f) => impactRank[f.impact] >= threshold);

  const previewText =
    flagged.length > 0
      ? `本${digestFrequency === "daily" ? "日" : digestFrequency === "weekly" ? "週" : ""}競爭情報彙整（${flagged.length} 則需留意）：\n` +
        flagged.map((f) => `・${f.competitor}｜${f.tag}｜${f.summary}`).join("\n")
      : "目前沒有達到通知門檻的競爭情報。";

  return (
    <AgentPageShell
      agent={agent}
      fallbackActivity={ACTIVITY_LOGS.competitor}
      onSettingsLoaded={onSettingsLoaded}
      previewText={previewText}
      previewTitle="情報摘要預覽"
      testPushLabel="傳送情報摘要測試"
      settings={{ competitors, sources, digestFrequency, minImpactToNotify }}
      settingsForm={
        <div className="space-y-4">
          <Field label="追蹤對手清單">
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput
                    value={c.name}
                    onChange={(e) => updateCompetitor(i, "name", e.target.value)}
                    placeholder="對手名稱"
                    className="w-32 shrink-0"
                  />
                  <TextInput
                    value={c.url}
                    onChange={(e) => updateCompetitor(i, "url", e.target.value)}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => removeCompetitor(i)}
                    className="shrink-0 rounded-lg border border-neutral-300 p-2 text-neutral-400 hover:text-red-500 dark:border-neutral-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCompetitors((prev) => [...prev, { name: "", url: "" }])}
                className="flex items-center gap-1 text-xs font-medium text-[#06C755]"
              >
                <Plus size={14} /> 新增對手
              </button>
            </div>
          </Field>

          <Field label="監控來源">
            <div className="flex flex-wrap gap-3">
              {SOURCE_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={sources.includes(s)}
                    onChange={() => toggleSource(s)}
                    className="h-4 w-4 rounded border-neutral-300 text-[#06C755] focus:ring-[#06C755]"
                  />
                  {s}
                </label>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="彙整頻率">
              <Select value={digestFrequency} onChange={(e) => setDigestFrequency(e.target.value)}>
                <option value="realtime">即時通知</option>
                <option value="daily">每日彙整</option>
                <option value="weekly">每週彙整</option>
              </Select>
            </Field>
            <Field label="通知門檻">
              <Select value={minImpactToNotify} onChange={(e) => setMinImpactToNotify(e.target.value)}>
                <option value="high">只通知高影響</option>
                <option value="mid">中影響以上都通知</option>
                <option value="low">全部都通知</option>
              </Select>
            </Field>
          </div>
        </div>
      }
      preview={
        <div className="space-y-4">
          <div className="space-y-2">
            {SAMPLE_FEED.map((f, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 p-2.5 text-xs dark:border-neutral-800">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">{f.competitor}</span>
                  <Badge tone={IMPACT_TONE[f.impact]}>{f.impact}影響</Badge>
                </div>
                <p className="text-neutral-500 dark:text-neutral-400">
                  {f.source} · {f.tag}
                </p>
                <p className="mt-1 text-neutral-700 dark:text-neutral-300">{f.summary}</p>
                <p className="mt-1 text-neutral-400">建議行動：{f.action}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-neutral-400">
            以上為示範情報。實際監控需要新聞／搜尋資料來源（如 Google News RSS 或搜尋 API），目前尚未接上，僅示範標籤分類與影響分級的呈現方式。
          </p>
        </div>
      }
    />
  );
}
