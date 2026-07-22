"use client";

import MarketingAgentShell from "@/components/agents/MarketingAgentShell";
import TrafficOverviewPanel from "@/components/agents/TrafficOverviewPanel";

export default function DataAgentPage() {
  return (
    <>
      <TrafficOverviewPanel />
      <MarketingAgentShell
        slug="report"
        integration="串接 GA4、廣告平台等成效數據來源"
        reportLabel="成效週報範本"
        previewText={"本週成效摘要 📊\n\n流量：—\n轉換：—\n整體 ROAS：—\n\nAI 洞察：待串接數據後自動產生。"}
      />
    </>
  );
}
