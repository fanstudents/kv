"use client";

import { Heart, MessageCircle, Share2 } from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import TrendChart from "@/components/agents/charts/TrendChart";
import StatTile from "@/components/agents/charts/StatTile";
import { SOCIAL_DEMO_POSTS, SOCIAL_DEMO_STATS, SOCIAL_DEMO_WEEKLY_ENGAGEMENT } from "@/lib/social-demo";

const SOCIAL_COLOR = "#8B5CF6"; // 跟 Sunny(社群 Agent)頭像色一致

const PLATFORM_TONE: Record<string, string> = {
  Instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
  Facebook: "bg-blue-500",
  Threads: "bg-neutral-900 dark:bg-neutral-700",
};

function PostMock({ post }: { post: (typeof SOCIAL_DEMO_POSTS)[number] }) {
  const isText = post.ratio === "text";

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`h-5 w-5 shrink-0 rounded-full ${PLATFORM_TONE[post.platform]}`} />
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{post.platform}</span>
        <span className="text-[11px] text-neutral-400">· {post.format}</span>
        <span className="ml-auto text-[11px] text-neutral-400">{post.scheduledAt}</span>
      </div>

      {isText ? (
        <div
          className="mx-3 mb-3 flex min-h-[96px] items-center rounded-lg p-4 text-sm text-white"
          style={{ background: `linear-gradient(135deg, ${post.gradient[0]}, ${post.gradient[1]})` }}
        >
          {post.caption}
        </div>
      ) : (
        <>
          <div
            className="h-40 w-full"
            style={{ background: `linear-gradient(135deg, ${post.gradient[0]}, ${post.gradient[1]})` }}
          />
          <p className="px-3 pt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{post.caption}</p>
        </>
      )}

      <div className="flex items-center gap-4 px-3 pb-3 pt-2 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1">
          <Heart size={12} /> {post.likes.toLocaleString("en-US")}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={12} /> {post.comments}
        </span>
        <span className="flex items-center gap-1">
          <Share2 size={12} /> {post.shares}
        </span>
      </div>
    </div>
  );
}

// 社群操盤手(Sunny)用:多版位貼文示範素材——本週成效數字、互動率趨勢，
// 以及跨平台(IG Feed／IG 限動／FB／Threads)的貼文草稿版位示範。
export default function SocialOverviewPanel() {
  return (
    <Card className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">社群經營成效(近 7 天)</h2>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">示範資料</Badge>
          <span className="text-xs text-neutral-400">來源:Instagram／Facebook／Threads</span>
        </div>
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
        <StatTile label="總觸及" value={SOCIAL_DEMO_STATS.totalReach.toLocaleString("en-US")} />
        <StatTile label="回覆留言" value={`${SOCIAL_DEMO_STATS.comments}`} />
      </div>

      <p className="mb-2 text-xs font-medium text-neutral-500">每日互動率趨勢(近 7 天)</p>
      <TrendChart
        data={SOCIAL_DEMO_WEEKLY_ENGAGEMENT}
        xKey="date"
        series={[{ key: "engagement", name: "互動率", color: SOCIAL_COLOR }]}
        valueFormatter={(v) => `${v}%`}
      />

      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-neutral-500">多版位貼文草稿(待你挑選定稿)</p>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          {SOCIAL_DEMO_POSTS.map((post) => (
            <PostMock key={`${post.platform}-${post.format}`} post={post} />
          ))}
        </div>
      </div>
    </Card>
  );
}
