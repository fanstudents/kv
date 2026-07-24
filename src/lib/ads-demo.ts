// 廣告投手(Dana)用:Meta／Google 廣告投放示範資料——花費、ROAS、CPA、平台拆分與受眾成效。

// 各平台投放拆分:花費佔比與 ROAS
export const ADS_DEMO_PLATFORMS: { platform: string; spend: number; roas: number; color: string }[] = [
  { platform: "Meta（FB/IG）", spend: 52400, roas: 3.6, color: "#1877F2" },
  { platform: "Google Ads", spend: 24800, roas: 3.2, color: "#EA4335" },
  { platform: "LINE 成效型", spend: 9200, roas: 2.8, color: "#06C755" },
];

// 受眾成效:各受眾組合的 ROAS 與轉換,凸顯加碼／排除建議
export const ADS_DEMO_AUDIENCES: { name: string; roas: number; conversions: number; action: "加碼" | "維持" | "排除" }[] = [
  { name: "再行銷｜30 天訪客", roas: 4.8, conversions: 186, action: "加碼" },
  { name: "類似受眾 1%｜高價值客", roas: 4.1, conversions: 142, action: "加碼" },
  { name: "興趣｜行銷科技", roas: 3.4, conversions: 98, action: "維持" },
  { name: "廣泛受眾｜25-44", roas: 2.6, conversions: 64, action: "維持" },
  { name: "舊受眾｜90 天已觸及", roas: 1.8, conversions: 22, action: "排除" },
];

export interface AdCampaignDemo {
  name: string;
  objective: string;
  spend: number;
  cpa: number;
  roas: number;
  ctr: number;
  status: "加碼機會" | "表現穩定" | "受眾疲勞";
}

export const ADS_DEMO_STATS = {
  spend: 86400,
  spendDelta: 12.4,
  roas: 3.4,
  roasDelta: 0.3,
  cpa: 312,
  cpaDelta: -8.2,
  ctr: 2.1,
  ctrDelta: 0.2,
};

export const ADS_DEMO_DAILY_SPEND = [
  { date: "07/17", spend: 11200, roas: 3.1 },
  { date: "07/18", spend: 12800, roas: 3.3 },
  { date: "07/19", spend: 10600, roas: 2.9 },
  { date: "07/20", spend: 13400, roas: 3.6 },
  { date: "07/21", spend: 12100, roas: 3.5 },
  { date: "07/22", spend: 14900, roas: 3.8 },
  { date: "07/23", spend: 11400, roas: 3.4 },
];

export const ADS_DEMO_CAMPAIGNS: AdCampaignDemo[] = [
  { name: "夏季優惠｜轉換活動", objective: "轉換", spend: 24800, cpa: 268, roas: 4.1, ctr: 2.6, status: "加碼機會" },
  { name: "新客開發｜名單廣告", objective: "名單", spend: 18200, cpa: 302, roas: 3.6, ctr: 2.2, status: "表現穩定" },
  { name: "品牌認知｜觸及廣告", objective: "觸及", spend: 15200, cpa: 410, roas: 2.2, ctr: 1.4, status: "受眾疲勞" },
  { name: "再行銷｜購物車挽回", objective: "轉換", spend: 12600, cpa: 245, roas: 4.8, ctr: 3.1, status: "加碼機會" },
  { name: "課程招生｜影片瀏覽", objective: "互動", spend: 9800, cpa: 356, roas: 2.9, ctr: 1.9, status: "表現穩定" },
  { name: "活動報名｜訊息廣告", objective: "訊息", spend: 5800, cpa: 388, roas: 2.4, ctr: 1.6, status: "受眾疲勞" },
];

export const ADS_DEMO_ALERT = {
  campaign: "品牌認知｜觸及廣告",
  metric: "CPA",
  overBy: "20%",
  day: "週四",
  suggestion: "受眾疲勞，建議排除近 30 天已觸及名單、更換素材",
};
