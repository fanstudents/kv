import type { TrafficOverview } from "./ga4";

// 數據參謀(Ivy)用:GA4 流量示範資料——介面示範，錄影／展示用途，暫時取代真實 GA4 串接。
// 想改回真實資料，把 report page／劇場模式改回呼叫 /api/agents/report/traffic-overview 即可，
// 形狀完全比照 TrafficOverview,隨時可以切回。

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date(Date.UTC(2026, 6, 23)); // 基準日 2026-07-23
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const GA4_DEMO_TREND_30D: { date: string; sessions: number; conversions: number }[] = Array.from(
  { length: 30 },
  (_, i) => {
    const daysAgo = 29 - i;
    const dow = new Date(`${isoDateDaysAgo(daysAgo)}T00:00:00Z`).getUTCDay();
    const weekendDip = dow === 0 || dow === 6 ? 0.78 : 1;
    const trendUp = 1 + (29 - daysAgo) * 0.012;
    const wave = 1 + 0.06 * Math.sin(i / 2.3);
    const sessions = Math.round(1180 * trendUp * weekendDip * wave);
    const conversions = Math.round(sessions * (0.032 + 0.004 * Math.sin(i / 4)));
    return { date: isoDateDaysAgo(daysAgo), sessions, conversions };
  }
);

const GA4_DEMO_CHANNEL_SPLIT: { channel: string; share: number }[] = [
  { channel: "Organic Search", share: 0.34 },
  { channel: "Direct", share: 0.24 },
  { channel: "Paid Social", share: 0.18 },
  { channel: "Organic Social", share: 0.14 },
  { channel: "Referral", share: 0.06 },
  { channel: "Email", share: 0.04 },
];

export function buildTrafficDemo(days: number): TrafficOverview {
  const dailyTrend = GA4_DEMO_TREND_30D.slice(-days);
  const sessions = dailyTrend.reduce((s, d) => s + d.sessions, 0);
  const conversions = dailyTrend.reduce((s, d) => s + d.conversions, 0);
  const activeUsers = Math.round(sessions * 0.78);

  const prevWindow = GA4_DEMO_TREND_30D.slice(-days * 2, -days);
  const prevSessions = prevWindow.reduce((s, d) => s + d.sessions, 0) || sessions;
  const sessionsDelta = sessions - prevSessions;

  const byChannel = GA4_DEMO_CHANNEL_SPLIT.map((c) => ({
    channel: c.channel,
    sessions: Math.round(sessions * c.share),
    conversions: Math.round(conversions * c.share),
  }));

  return { sessions, activeUsers, conversions, sessionsDelta, byChannel, dailyTrend };
}
