// 輿情哨兵(Jay)用:多平台情緒分數與競品動向資料。以「情緒分數」為主軸——
// 各平台情緒溫度、情緒組成、情緒關鍵詞、聲量趨勢與競品情緒對比。

export interface PlatformSentimentDemo {
  platform: string;
  score: number; // 0-100，越高越正面
  mentions: number;
  /** 情緒組成(正/中立/負，百分比) */
  positive: number;
  neutral: number;
  negative: number;
  trend: "up" | "down" | "flat";
  delta: number; // 情緒分數較上週變化
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
  /** 該則聲量的情緒分數(0-100) */
  score: number;
  time: string;
}

export const REPUTATION_DEMO_STATS = {
  totalMentions: 1284,
  mentionsDelta: 6.4,
  positiveRatio: 76,
  positiveRatioDelta: 4,
  /** 綜合情緒溫度(0-100) */
  sentimentScore: 78,
  sentimentDelta: 3,
  pendingNegative: 3,
  /** 淨情緒值 NPS 風格(正面% - 負面%) */
  netSentiment: 68,
};

// 情緒組成總覽(近 7 天所有聲量的情緒分佈)
export const REPUTATION_DEMO_EMOTION_MIX = {
  positive: 76,
  neutral: 16,
  negative: 8,
};

// 情緒關鍵詞雲(依出現次數;正面／負面分開),讓人一眼看到大家在稱讚什麼、抱怨什麼
export const REPUTATION_DEMO_KEYWORDS: { word: string; count: number; sentiment: "positive" | "negative" }[] = [
  { word: "回覆快", count: 142, sentiment: "positive" },
  { word: "很專業", count: 118, sentiment: "positive" },
  { word: "介面好用", count: 96, sentiment: "positive" },
  { word: "會回購", count: 74, sentiment: "positive" },
  { word: "價格偏高", count: 58, sentiment: "negative" },
  { word: "客服慢", count: 41, sentiment: "negative" },
  { word: "教學不足", count: 27, sentiment: "negative" },
];

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
  { platform: "Instagram", score: 84, mentions: 268, positive: 82, neutral: 13, negative: 5, trend: "up", delta: 5 },
  { platform: "Google 評論", score: 82, mentions: 312, positive: 80, neutral: 12, negative: 8, trend: "up", delta: 4 },
  { platform: "Threads", score: 76, mentions: 214, positive: 74, neutral: 18, negative: 8, trend: "up", delta: 6 },
  { platform: "Facebook", score: 68, mentions: 456, positive: 64, neutral: 24, negative: 12, trend: "flat", delta: 0 },
  { platform: "Dcard", score: 54, mentions: 189, positive: 50, neutral: 28, negative: 22, trend: "down", delta: -3 },
  { platform: "PTT", score: 47, mentions: 96, positive: 42, neutral: 26, negative: 32, trend: "down", delta: -5 },
];

// 競品情緒對比:同一時間窗，各品牌的綜合情緒溫度與聲量,凸顯我方情緒領先
export const REPUTATION_DEMO_COMPETITOR_SENTIMENT: { brand: string; score: number; mentions: number; isOwn?: boolean }[] = [
  { brand: "我方品牌", score: 78, mentions: 1284, isOwn: true },
  { brand: "品牌 A", score: 71, mentions: 1560 },
  { brand: "品牌 B", score: 64, mentions: 890 },
  { brand: "品牌 C", score: 52, mentions: 640 },
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
    quote: "剛用了這家的 AI 客服，回覆速度真的差很多，大推！",
    sentiment: "positive",
    score: 92,
    time: "35 分鐘前",
  },
  {
    platform: "Threads",
    handle: "@biz_talk_tw",
    quote: "同業都在討論這家的行銷 Agent，反應蠻快的，想了解報價",
    sentiment: "positive",
    score: 81,
    time: "1 小時前",
  },
  {
    platform: "Facebook",
    handle: "王小姐",
    quote: "服務很專業，整個團隊回覆速度超快，一定會再回購！",
    sentiment: "positive",
    score: 95,
    time: "2 小時前",
  },
  {
    platform: "PTT",
    handle: "womentalk 板",
    quote: "詢問度爆高，但客服回覆有點慢，等了兩天才收到回覆",
    sentiment: "negative",
    score: 34,
    time: "3 小時前",
  },
  {
    platform: "Dcard",
    handle: "匿名",
    quote: "價格偏高但品質有到，算是一分錢一分貨吧",
    sentiment: "neutral",
    score: 58,
    time: "4 小時前",
  },
  {
    platform: "Instagram",
    handle: "@design.daily",
    quote: "介面設計質感在線，數據面板一看就懂，加分！",
    sentiment: "positive",
    score: 88,
    time: "5 小時前",
  },
  {
    platform: "Threads",
    handle: "@marketer.wei",
    quote: "自動化流程省超多時間，但教學文件可以再多一點",
    sentiment: "neutral",
    score: 62,
    time: "6 小時前",
  },
  {
    platform: "PTT",
    handle: "Soft_Job 板",
    quote: "導入後每天省下 2 小時的報表工作，值得",
    sentiment: "positive",
    score: 84,
    time: "8 小時前",
  },
];

export const REPUTATION_DEMO_LATEST_NEGATIVE = {
  platform: "Google 評論",
  excerpt: "客服回覆速度比較慢，等了兩天才收到回覆…",
  suggestedReply: "已為您加急處理並私訊致歉，感謝您的耐心，會持續優化回覆效率。",
};
