"use client";

import MarketingAgentShell from "@/components/agents/MarketingAgentShell";
import SeoOverviewPanel from "@/components/agents/SeoOverviewPanel";

export default function SeoAgentPage() {
  return (
    <>
      <SeoOverviewPanel />
      <MarketingAgentShell
        slug="expense"
        integration="串接 Google Search Console 並設定要追蹤的網域與關鍵字"
        reportLabel="SEO 週報範本"
        previewText={"SEO 週報 🔍\n\n關鍵字排名變化：—\n自然流量：—\n本週優化建議：待串接後由 AI 提供。"}
      />
    </>
  );
}
