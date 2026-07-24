"use client";

import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TrendChart from "@/components/agents/charts/TrendChart";
import StatTile from "@/components/agents/charts/StatTile";
import BreakdownBars from "@/components/agents/charts/BreakdownBars";
import {
  ADS_DEMO_ALERT,
  ADS_DEMO_AUDIENCES,
  ADS_DEMO_CAMPAIGNS,
  ADS_DEMO_DAILY_SPEND,
  ADS_DEMO_PLATFORMS,
  ADS_DEMO_STATS,
} from "@/lib/ads-demo";

const ADS_COLOR = "#EF4444"; // 跟 Dana(廣告 Agent)頭像色一致

const STATUS_TONE: Record<string, "success" | "neutral" | "warning"> = {
  加碼機會: "success",
  表現穩定: "neutral",
  受眾疲勞: "warning",
};

const AUDIENCE_TONE: Record<string, "success" | "neutral" | "danger"> = {
  加碼: "success",
  維持: "neutral",
  排除: "danger",
};

// 廣告投手(Dana)用:Meta 廣告投放示範儀表板——花費/ROAS/CPA/CTR 重點數字、
// 每日花費趨勢、依廣告組合拆解成效，並附一則超標提醒範例。
export default function AdsOverviewPanel() {
  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">廣告投放成效(近 7 天)</h2>
        <span className="text-xs text-neutral-400">來源:Meta／Google 廣告管理員</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="廣告花費"
          value={`NT$ ${ADS_DEMO_STATS.spend.toLocaleString("en-US")}`}
          delta={ADS_DEMO_STATS.spendDelta}
          deltaSuffix="%"
          hint="較前 7 天"
        />
        <StatTile label="整體 ROAS" value={ADS_DEMO_STATS.roas.toFixed(1)} delta={ADS_DEMO_STATS.roasDelta} hint="較前 7 天" />
        <StatTile
          label="平均 CPA"
          value={`NT$ ${ADS_DEMO_STATS.cpa}`}
          delta={-ADS_DEMO_STATS.cpaDelta}
          deltaSuffix="%"
          hint="正值＝成本下降"
        />
        <StatTile label="平均 CTR" value={`${ADS_DEMO_STATS.ctr}%`} delta={ADS_DEMO_STATS.ctrDelta} deltaSuffix="pt" hint="較前 7 天" />
      </div>

      <p className="mb-2 text-xs font-medium text-neutral-500">每日花費趨勢(近 7 天)</p>
      <TrendChart
        data={ADS_DEMO_DAILY_SPEND}
        xKey="date"
        series={[{ key: "spend", name: "花費", color: ADS_COLOR }]}
        valueFormatter={(v) => `NT$ ${v.toLocaleString("en-US")}`}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-neutral-500">各平台花費拆分</p>
          <BreakdownBars
            items={ADS_DEMO_PLATFORMS.map((p) => ({ label: `${p.platform}（ROAS ${p.roas}）`, value: p.spend, color: p.color }))}
            valueFormatter={(v) => `NT$ ${v.toLocaleString("en-US")}`}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-neutral-500">受眾成效與建議</p>
          <ul className="space-y-1.5">
            {ADS_DEMO_AUDIENCES.map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-neutral-600 dark:text-neutral-300">{a.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">ROAS {a.roas}</span>
                  <Badge tone={AUDIENCE_TONE[a.action]}>{a.action}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium text-neutral-500">依廣告組合拆解(依花費排序)</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-400 dark:border-neutral-800">
                <th className="py-2 pr-3 font-medium">廣告組合</th>
                <th className="px-3 py-2 font-medium">花費</th>
                <th className="px-3 py-2 font-medium">CPA</th>
                <th className="px-3 py-2 font-medium">ROAS</th>
                <th className="px-3 py-2 font-medium">CTR</th>
                <th className="py-2 pl-3 text-right font-medium">狀態</th>
              </tr>
            </thead>
            <tbody>
              {ADS_DEMO_CAMPAIGNS.map((c) => (
                <tr key={c.name} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-neutral-700 dark:text-neutral-200">{c.name}</p>
                    <p className="text-[11px] text-neutral-400">{c.objective}</p>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-300">
                    NT$ {c.spend.toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-300">NT$ {c.cpa}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                      {c.roas >= 3.5 ? (
                        <TrendingUp size={12} className="text-[#06C755]" />
                      ) : (
                        <TrendingDown size={12} className="text-red-400" />
                      )}
                      {c.roas.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-300">{c.ctr}%</td>
                  <td className="py-2.5 pl-3 text-right">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <span className="font-semibold">{ADS_DEMO_ALERT.day}示範提醒：</span>
          「{ADS_DEMO_ALERT.campaign}」的 {ADS_DEMO_ALERT.metric} 高於門檻 {ADS_DEMO_ALERT.overBy}。
          {ADS_DEMO_ALERT.suggestion}。
        </p>
      </div>
    </Card>
  );
}
