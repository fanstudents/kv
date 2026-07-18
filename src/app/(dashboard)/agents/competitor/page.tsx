"use client";

import MarketingAgentShell from "@/components/agents/MarketingAgentShell";

export default function ReputationAgentPage() {
  return (
    <MarketingAgentShell
      slug="competitor"
      integration="設定要監測的品牌關鍵字與社群／評論資料來源"
      reportLabel="口碑警示範本"
      previewText={"🗣️ 口碑監測提醒\n\n偵測到一則需要留意的負面聲量：—\n來源：— · 情緒：負面\n建議：儘快查看並回應。"}
    />
  );
}
