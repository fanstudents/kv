"use client";

import MarketingAgentShell from "@/components/agents/MarketingAgentShell";

export default function SocialAgentPage() {
  return (
    <MarketingAgentShell
      slug="card"
      integration="串接社群平台（如 Facebook／Instagram／Threads）並設定品牌調性"
      reportLabel="貼文提案範本"
      previewText={"今日社群貼文提案 ✍️\n\n主題：—\n文案：待串接後由 AI 依品牌調性發想\n建議發文時間：—"}
    />
  );
}
