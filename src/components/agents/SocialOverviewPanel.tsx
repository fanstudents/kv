"use client";

import { Heart, MessageCircle, Share2 } from "lucide-react";
import Card from "@/components/ui/Card";
import TrendChart from "@/components/agents/charts/TrendChart";
import StatTile from "@/components/agents/charts/StatTile";
import {
  SOCIAL_DEMO_BEST_TIMES,
  SOCIAL_DEMO_PLATFORMS,
  SOCIAL_DEMO_POSTS,
  SOCIAL_DEMO_STATS,
  SOCIAL_DEMO_WEEKLY_ENGAGEMENT,
} from "@/lib/social-demo";

const SOCIAL_COLOR = "#8B5CF6"; // 跟 Sunny(社群 Agent)頭像色一致

const PLATFORM_DOT: Record<string, string> = {
  Instagram: "#EC4899",
  Facebook: "#3B82F6",
  Threads: "#8B5CF6",
};

// 社群操盤手(Sunny)用:純數字的社群成效——本週重點數字、互動率趨勢、各平台成效、
// 最佳發文時段，以及每篇貼文的互動數字（不放示意圖片）。
export default function SocialOverviewPanel() {
  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">社群經營成效(近 7 天)</h2>
        <span className="text-xs text-neutral-400">來源:Instagram／Facebook／Threads</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="本週發文" value={`${SOCIAL_DEMO_STATS.posts}`} delta={SOCIAL_DEMO_STATS.postsDelta} hint="較前 7 天" />
        <StatTile
          label="平均互動率"
          value={`${SOCIAL_DEMO_STATS.avgEngagement}%`}
          delta={SOCIAL_DEMO_STATS.avgEngagementDelta}
          deltaSuffix="pt"
          hint="較前 7 天"
        />
        <StatTile
          label="總觸及"
          value={SOCIAL_DEMO_STATS.totalReach.toLocaleString("en-US")}
          delta={SOCIAL_DEMO_STATS.reachDelta}
          deltaSuffix="%"
        />
        <StatTile
          label="新增粉絲"
          value={`+${SOCIAL_DEMO_STATS.followerGrowth.toLocaleString("en-US")}`}
          delta={SOCIAL_DEMO_STATS.followerGrowthDelta}
          deltaSuffix="%"
        />
      </div>

      <p className="mb-2 text-xs font-medium text-neutral-500">每日互動率趨勢(近 7 天)</p>
      <TrendChart
        data={SOCIAL_DEMO_WEEKLY_ENGAGEMENT}
        xKey="date"
        series={[{ key: "engagement", name: "互動率", color: SOCIAL_COLOR }]}
        valueFormatter={(v) => `${v}%`}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-medium text-neutral-500">各平台成效</p>
          <ul className="space-y-3">
            {SOCIAL_DEMO_PLATFORMS.map((p) => (
              <li key={p.platform}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                    {p.platform}
                  </span>
                  <span className="text-neutral-400">
                    {p.followers.toLocaleString("en-US")} 粉 ·{" "}
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">{p.engagement}%</span> 互動
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-full rounded-full" style={{ width: `${(p.engagement / 8) * 100}%`, background: p.color }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium text-neutral-500">最佳發文時段熱度</p>
          <div className="flex items-end justify-between gap-1.5" style={{ height: 96 }}>
            {SOCIAL_DEMO_BEST_TIMES.map((t) => (
              <div key={t.slot} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${t.heat}%`,
                      background: t.heat >= 85 ? SOCIAL_COLOR : `${SOCIAL_COLOR}55`,
                    }}
                    title={`${t.slot} 熱度 ${t.heat}`}
                  />
                </div>
                <span className="text-[10px] text-neutral-400">{t.slot}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-neutral-500">近期貼文互動成效</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-400 dark:border-neutral-800">
                <th className="py-2 pr-3 font-medium">貼文</th>
                <th className="px-2 py-2 text-right font-medium">
                  <Heart size={12} className="inline" />
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  <MessageCircle size={12} className="inline" />
                </th>
                <th className="px-2 py-2 text-right font-medium">
                  <Share2 size={12} className="inline" />
                </th>
                <th className="py-2 pl-2 text-right font-medium">排程</th>
              </tr>
            </thead>
            <tbody>
              {SOCIAL_DEMO_POSTS.map((post) => (
                <tr
                  key={`${post.platform}-${post.format}`}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
                >
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PLATFORM_DOT[post.platform] }} />
                      <span className="font-medium text-neutral-700 dark:text-neutral-200">{post.platform}</span>
                      <span className="text-neutral-400">{post.format}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-neutral-600 dark:text-neutral-300">
                    {post.likes.toLocaleString("en-US")}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-neutral-600 dark:text-neutral-300">{post.comments}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-neutral-600 dark:text-neutral-300">{post.shares}</td>
                  <td className="py-2.5 pl-2 text-right text-neutral-400">{post.scheduledAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
