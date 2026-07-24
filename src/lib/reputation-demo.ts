// 輿情哨兵(Jay)用:多平台情緒分數與競品動向示範資料——介面示範，尚未串接真實監測來源，數字為示意。
// 待串接社群聆聽/評論監測服務後，改由真實資料驅動。

export interface PlatformSentimentDemo {
  platform: string;
  score: number; // 0-100，越高越正面
  mentions: number;
  trend: "up" | "down" | "flat";
}

export interface CompetitorMoveDemo {
  competitor: string;
  move: string;
  date: string;
  impact: "high" | "medium" | "low";
}

export interface MentionDemo {
  platform: "Instagram" | "Threads" | "PTT" | "Facebook" | "Dcard";
  handle: string;
  quote: string;
  sentiment: "positive" | "negative" | "neutral";
  time: string;
}

export const REPUTATION_DEMO_STATS = {
  totalMentions: 1284,
  mentionsDelta: 6.4,
  positiveRatio: 76,
  positiveRatioDelta: 4,
  pendingNegative: 3,
};

export const REPUTATION_DEMO_TREND = [
  { date: "07/17", positive: 68, negative: 12 },
  { date: "07/18", positive: 74, negative: 9 },
  { date: "07/19", positive: 71, negative: 14 },
  { date: "07/20", positive: 79, negative: 8 },
  { date: "07/21", positive: 82, negative: 6 },
  { date: "07/22", positive: 77, negative: 10 },
  { date: "07/23", positive: 80, negative: 7 },
];

export const REPUTATION_DEMO_PLATFORMS: PlatformSentimentDemo[] = [
  { platform: "Google 評論", score: 82, mentions: 312, trend: "up" },
  { platform: "Facebook", score: 68, mentions: 456, trend: "flat" },
  { platform: "Threads／IG", score: 74, mentions: 231, trend: "up" },
  { platform: "Dcard", score: 54, mentions: 189, trend: "down" },
  { platform: "PTT", score: 47, mentions: 96, trend: "down" },
];

export const REPUTATION_DEMO_COMPETITOR_MOVES: CompetitorMoveDemo[] = [
  { competitor: "品牌 A", move: "推出限時優惠方案，社群聲量週增 22%", date: "07/20", impact: "high" },
  { competitor: "品牌 B", move: "更換官網視覺與定價頁，疑似調整產品定位", date: "07/19", impact: "medium" },
  { competitor: "品牌 C", move: "Google 評論出現多則物流延遲負評", date: "07/18", impact: "low" },
  { competitor: "品牌 A", move: "邀請 3 位中型 KOL 開箱，預期下週聲量續增", date: "07/16", impact: "medium" },
];

export const REPUTATION_DEMO_MENTIONS: MentionDemo[] = [
  {
    platform: "Instagram",
    handle: "@sharon_life",
    quote: "剛用了這家的 AI 客服，回覆速度真的差很多，推薦！",
    sentiment: "positive",
    time: "35 分鐘前",
  },
  {
    platform: "Threads",
    handle: "@biz_talk_tw",
    quote: "同業都在討論這家的行銷 Agent，反應蠻快的，蠻想了解報價",
    sentiment: "positive",
    time: "1 小時前",
  },
  {
    platform: "PTT",
    handle: "womentalk 板",
    quote: "詢問度爆高，但客服回覆有點慢，等了兩天才收到回覆",
    sentiment: "negative",
    time: "2 小時前",
  },
  {
    platform: "Facebook",
    handle: "王小姐",
    quote: "服務很專業，回覆速度超快，會再回購！",
    sentiment: "positive",
    time: "3 小時前",
  },
  {
    platform: "Dcard",
    handle: "匿名",
    quote: "價格偏高但品質有到，算是一分錢一分貨",
    sentiment: "neutral",
    time: "5 小時前",
  },
];

export const REPUTATION_DEMO_LATEST_NEGATIVE = {
  platform: "Google 評論",
  excerpt: "客服回覆速度比較慢，等了兩天才收到回覆…",
  suggestedReply: "已為您加急處理並私訊致歉，感謝您的耐心，會持續優化回覆效率。",
};
