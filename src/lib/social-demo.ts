// 社群操盤手(Sunny)用:多版位社群貼文示範素材——跨平台成效、粉絲成長、最佳發文時段。

export interface SocialPostDemo {
  platform: "Instagram" | "Facebook" | "Threads";
  format: string;
  ratio: string;
  gradient: [string, string];
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  scheduledAt: string;
}

export const SOCIAL_DEMO_STATS = {
  posts: 6,
  postsDelta: 1,
  avgEngagement: 6.2,
  avgEngagementDelta: 0.8,
  totalReach: 48300,
  reachDelta: 12.5,
  comments: 88,
  followerGrowth: 1240,
  followerGrowthDelta: 18,
};

// 各平台成效拆分:粉絲數、本週互動率、觸及
export const SOCIAL_DEMO_PLATFORMS: { platform: string; followers: number; engagement: number; reach: number; color: string }[] = [
  { platform: "Instagram", followers: 18400, engagement: 6.8, reach: 24200, color: "#EC4899" },
  { platform: "Facebook", followers: 12600, engagement: 4.2, reach: 15600, color: "#3B82F6" },
  { platform: "Threads", followers: 8900, engagement: 7.4, reach: 8500, color: "#8B5CF6" },
];

// 最佳發文時段熱度(依歷史互動率,0-100),排程參考
export const SOCIAL_DEMO_BEST_TIMES: { slot: string; heat: number }[] = [
  { slot: "09:00", heat: 42 },
  { slot: "12:00", heat: 88 },
  { slot: "15:00", heat: 54 },
  { slot: "18:00", heat: 72 },
  { slot: "20:00", heat: 96 },
  { slot: "22:00", heat: 68 },
];

export const SOCIAL_DEMO_WEEKLY_ENGAGEMENT = [
  { date: "07/17", engagement: 4.8 },
  { date: "07/18", engagement: 5.2 },
  { date: "07/19", engagement: 6.2 },
  { date: "07/20", engagement: 5.6 },
  { date: "07/21", engagement: 4.9 },
  { date: "07/22", engagement: 5.8 },
  { date: "07/23", engagement: 6.0 },
];

export const SOCIAL_DEMO_POSTS: SocialPostDemo[] = [
  {
    platform: "Instagram",
    format: "Feed 貼文",
    ratio: "1:1",
    gradient: ["#8B5CF6", "#EC4899"],
    caption: "夏季優惠正式開跑 ☀️ 前 100 名下單再送限量小禮，連結在個人檔案！",
    likes: 482,
    comments: 36,
    shares: 12,
    scheduledAt: "明日 12:00",
  },
  {
    platform: "Instagram",
    format: "限時動態",
    ratio: "9:16",
    gradient: ["#6366F1", "#8B5CF6"],
    caption: "3 個常見問題，滑動看解答 →",
    likes: 214,
    comments: 8,
    shares: 25,
    scheduledAt: "明日 09:00",
  },
  {
    platform: "Facebook",
    format: "連結貼文",
    ratio: "1.91:1",
    gradient: ["#3B82F6", "#8B5CF6"],
    caption: "【客戶案例】三個月導入 AI 客服，回覆時間縮短 70%——完整故事看這裡",
    likes: 156,
    comments: 22,
    shares: 41,
    scheduledAt: "後天 10:30",
  },
  {
    platform: "Threads",
    format: "文字貼文",
    ratio: "text",
    gradient: ["#171717", "#404040"],
    caption: "做行銷這幾年學到最重要的一件事：與其追熱點，不如把基本功練扎實。",
    likes: 328,
    comments: 47,
    shares: 19,
    scheduledAt: "今日 20:00",
  },
];
