"use client";

import MarketingAgentShell from "@/components/agents/MarketingAgentShell";
import AdsOverviewPanel from "@/components/agents/AdsOverviewPanel";

export default function AdsAgentPage() {
  return (
    <MarketingAgentShell
      slug="today"
      integration="串接 Meta／Google 廣告帳號並設定要監控的成效門檻"
      reportLabel="廣告異常提醒範本"
      previewText={"⚠️ 廣告成效提醒\n\n廣告組合「—」的 CPA 已高於門檻，建議檢視素材或調整預算。\n目前花費：— · ROAS：—"}
      topPanel={<AdsOverviewPanel />}
    />
  );
}
