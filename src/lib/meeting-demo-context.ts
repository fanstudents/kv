import { ADS_DEMO_AUDIENCES, ADS_DEMO_CAMPAIGNS, ADS_DEMO_PLATFORMS, ADS_DEMO_STATS } from "./ads-demo";
import { buildTrafficDemo } from "./ga4-demo";
import { buildSearchDemo } from "./gsc-demo";
import { SOCIAL_DEMO_PLATFORMS, SOCIAL_DEMO_POSTS, SOCIAL_DEMO_STATS } from "./social-demo";
import {
  REPUTATION_DEMO_KEYWORDS,
  REPUTATION_DEMO_PLATFORMS,
  REPUTATION_DEMO_STATS,
} from "./reputation-demo";

// 示範模式下，會議室 Agent 手上的「業務資料」。
//
// 為什麼需要這支：meeting-context.ts 抓的是真實資料（Supabase／Google／GSC／GA4…），
// 沒串接或沒資料時會回空字串，Agent 就只能照實說「目前沒有這筆資料」——展示給學員看時
// 一問三不知，整場會議是空的。這裡依 slug 給一份具體到有名字、有數字、有日期的業務現況，
// 讓每位 Agent 都講得出東西。
//
// 兩個刻意的設計：
//
// 1. **數字直接取自各頁面正在用的同一份示範資料**（ads-demo／ga4-demo／gsc-demo／
//    social-demo／reputation-demo）。展示時你會一邊開會、一邊切到儀表板看——
//    Dana 在會議裡說 ROAS 3.4，你切到廣告頁也要看到 3.4，兩邊對不起來就穿幫了。
//    沒有對應資料集的 Agent（訂單／客服／通知／營運…）才另外寫一份，同樣寫死成常數，
//    不用亂數，這樣每次展示講出來的內容都一樣，你才背得起來、學員問第二次也對得上。
//
// 2. **示範模式下完全不碰真實資料。** 呼叫端會拿這份取代 getAgentLiveContext()，
//    而不是兩份相加——上台展示時，畫面與語音都不會不小心念出真實客戶的名字。

const nf = new Intl.NumberFormat("zh-TW");

/** 廣告投手 Dana：花費、ROAS、平台拆分、受眾成效、進行中檔期 */
function todayDemo(): string {
  const s = ADS_DEMO_STATS;
  const platforms = ADS_DEMO_PLATFORMS.map(
    (p) => `${p.platform} 花費 NT$${nf.format(p.spend)}、ROAS ${p.roas}`
  ).join("；");
  const audiences = ADS_DEMO_AUDIENCES.map(
    (a) => `「${a.name}」ROAS ${a.roas}、${a.conversions} 筆轉換，建議${a.action}`
  ).join("；");
  const campaigns = ADS_DEMO_CAMPAIGNS.slice(0, 4)
    .map((c) => `${c.name}（${c.status}）花費 NT$${nf.format(c.spend)}、ROAS ${c.roas}`)
    .join("；");
  return [
    `【本週廣告投放現況】總花費 NT$${nf.format(s.spend)}（較上週 ${s.spendDelta > 0 ? "+" : ""}${s.spendDelta}%），` +
      `整體 ROAS ${s.roas}（${s.roasDelta > 0 ? "+" : ""}${s.roasDelta}）、CPA NT$${s.cpa}（${s.cpaDelta}%）、CTR ${s.ctr}%（${s.ctrDelta > 0 ? "+" : ""}${s.ctrDelta}%）。`,
    `平台拆分：${platforms}。`,
    `受眾成效：${audiences}。`,
    `進行中檔期：${campaigns}。`,
    `本週判斷：CPA 已連三日上升，疲勞素材是主因；建議關閉表現最差的兩組素材，預算移到新素材測試。`,
  ].join("\n");
}

/** 數據參謀 Ivy：GA4 流量、轉換、渠道拆分 */
function reportDemo(): string {
  const t = buildTrafficDemo(28);
  const channels = t.byChannel
    .map((c) => `${c.channel} ${nf.format(c.sessions)} 次工作階段／${nf.format(c.conversions)} 轉換`)
    .join("；");
  // 不引用 buildTrafficDemo 的 sessionsDelta：示範趨勢陣列只有 8 天，
  // 前期視窗取不滿 28 天，算出來的成長幅度大到不合理（講出來一聽就是假的）。
  return [
    `【近 28 天網站流量】工作階段 ${nf.format(t.sessions)} 次，` +
      `活躍使用者 ${nf.format(t.activeUsers)}，完成轉換 ${nf.format(t.conversions)} 次。`,
    `渠道拆分：${channels}。`,
    `本週要提醒老闆的：自然搜尋帶進來的轉換成長最快，但付費流量的轉換率在下滑，值得跟廣告 Agent 一起看。`,
  ].join("\n");
}

/** SEO 尖兵 Leo：GSC 點擊、曝光、排名、關鍵字 */
function expenseDemo(): string {
  const g = buildSearchDemo(28);
  const queries = g.topQueries
    .slice(0, 5)
    .map((q) => `「${q.query}」點擊 ${q.clicks}、曝光 ${nf.format(q.impressions)}、平均排名 ${q.position}`)
    .join("；");
  // 同 reportDemo：不引用 clicksDelta，前期視窗取不滿，算出來的成長幅度不合理。
  return [
    `【近 28 天自然搜尋】總點擊 ${nf.format(g.totalClicks)}，` +
      `總曝光 ${nf.format(g.totalImpressions)}，平均 CTR ${(g.avgCtr * 100).toFixed(1)}%，平均排名 ${g.avgPosition.toFixed(1)}（較上期進步 ${g.positionDelta}）。`,
    `主力關鍵字：${queries}。`,
    `本週判斷：「比較型」字群（例如「ai 客服 系統推薦」）排名進步最快，建議加開一批比較文選題；` +
      `另有 4 篇舊文排名滑落，安排改寫更新。`,
  ].join("\n");
}

/** 社群操盤手 Sunny：貼文成效、平台拆分、粉絲成長 */
function cardDemo(): string {
  const s = SOCIAL_DEMO_STATS;
  const platforms = SOCIAL_DEMO_PLATFORMS.map(
    (p) => `${p.platform} 粉絲 ${nf.format(p.followers)}、互動率 ${p.engagement}%、觸及 ${nf.format(p.reach)}`
  ).join("；");
  const posts = SOCIAL_DEMO_POSTS.slice(0, 4)
    .map(
      (p) =>
        `${p.platform}／${p.format}「${p.caption}」讚 ${nf.format(p.likes)}、留言 ${p.comments}、分享 ${p.shares}`
    )
    .join("；");
  return [
    `【本週社群成效】發佈 ${s.posts} 則（較上週 ${s.postsDelta > 0 ? "+" : ""}${s.postsDelta}），` +
      `平均互動率 ${s.avgEngagement}%（${s.avgEngagementDelta > 0 ? "+" : ""}${s.avgEngagementDelta}%），` +
      `總觸及 ${nf.format(s.totalReach)}（${s.reachDelta > 0 ? "+" : ""}${s.reachDelta}%），` +
      `留言 ${s.comments} 則，粉絲淨增 ${nf.format(s.followerGrowth)}。`,
    `平台拆分：${platforms}。`,
    `本週表現最好的貼文：${posts}。`,
    `本週判斷：「經營者日常」這類敘事型貼文互動率最高，下週建議五篇中排三篇走這條線。`,
  ].join("\n");
}

/** 輿情哨兵 Jay：情緒分數、聲量、平台情緒、待處理負評 */
function competitorDemo(): string {
  const r = REPUTATION_DEMO_STATS;
  const platforms = REPUTATION_DEMO_PLATFORMS.map(
    (p) => `${p.platform} 情緒 ${p.score} 分、聲量 ${nf.format(p.mentions)} 則（正面 ${p.positive}%／負面 ${p.negative}%）`
  ).join("；");
  const positive = REPUTATION_DEMO_KEYWORDS.filter((k) => k.sentiment === "positive")
    .slice(0, 4)
    .map((k) => `${k.word}（${k.count}）`)
    .join("、");
  const negative = REPUTATION_DEMO_KEYWORDS.filter((k) => k.sentiment === "negative")
    .slice(0, 4)
    .map((k) => `${k.word}（${k.count}）`)
    .join("、");
  return [
    `【近 7 天品牌聲量】總提及 ${nf.format(r.totalMentions)} 則（${r.mentionsDelta > 0 ? "+" : ""}${r.mentionsDelta}%），` +
      `綜合情緒溫度 ${r.sentimentScore} 分（${r.sentimentDelta > 0 ? "+" : ""}${r.sentimentDelta}），` +
      `正面佔比 ${r.positiveRatio}%，淨情緒值 ${r.netSentiment}。`,
    `平台情緒：${platforms}。`,
    `正面關鍵詞：${positive}。負面關鍵詞：${negative}。`,
    `待處理負評 ${r.pendingNegative} 則，都還在 24 小時回應期限內，最舊的一則來自 PTT，關於到貨時間。`,
  ].join("\n");
}

// ── 以下這幾位沒有對應的示範資料集，另外寫一份固定的業務現況 ──────────────

/** 訂單值班員 Ray */
function ordersDemo(): string {
  return [
    `【本月訂單現況】成立訂單 124 筆、營收 NT$328,500（月目標 NT$500,000，達成率 66%）。` +
      `平均客單價 NT$2,649，較上月成長 8%。`,
    `近期訂單：#5233 AI 行銷實戰課 ×2（已付款）；#5229 企業內訓方案（待匯款確認，已寄出提醒）；` +
      `#5218 一對一陪跑三個月（已付款，待安排首次會議）；#5205 公開課早鳥（已退款，學員時間衝突）。`,
    `異常提醒：有 3 筆訂單超過 48 小時未完成付款，已自動發過一次提醒，建議由客服接手跟進。`,
    `本月退款率 1.6%，低於上月的 2.4%。`,
  ].join("\n");
}

/** 客服接待專員 Amber */
function supportDemo(): string {
  return [
    `【本週客服現況】進線 218 則，自動結案 113 則（結案率 52%），轉真人 105 則。` +
      `平均首次回覆 6.4 分鐘，目標是 3 分鐘以內，還沒達標。`,
    `最常被問的三件事：課程時間與地點（38 則）、發票與報帳方式（27 則）、企業內訓怎麼報價（21 則）。`,
    `待處理：2 則客訴等真人回覆——一則抱怨課程通知太晚寄出，一則詢問能否轉讓名額。`,
    `本週判斷：「發票與報帳」這題重複度很高，但知識庫裡的答案寫得太簡略，建議補一條完整的 SOP 進去。`,
  ].join("\n");
}

/** 商務邀約專員 Coco */
function visitDemo(): string {
  return [
    `【邀約與拜訪現況】本月已辨識名片 31 張，寄出邀約信 22 封，回覆 11 封（回覆率 48%），` +
      `實際排進行事曆 13 場（月目標 20 場）。`,
    `近期名片與狀態：宏鑫精密 王經理（已回覆，週四下午兩點確認）；德豐生技 李協理（已寄出邀約，尚未回覆）；` +
      `原禾食品 陳總（已回覆，希望改線上）；台鋼智造 周廠長（已辨識，還沒決定要不要約）。`,
    `本週判斷：製造業客戶回覆率明顯高於服務業，下一批名單建議優先挑製造業。`,
    `另外有 4 封邀約信寄出超過一週沒回覆，建議發第二次追蹤。`,
  ].join("\n");
}

/** 行程助理 Milo */
function scheduleDemo(): string {
  return [
    `【本週行程】共 9 場，已完成 5 場、待進行 4 場。`,
    `接下來：週四 14:00 宏鑫精密到府拜訪（台中，需提前 90 分鐘出發）；` +
      `週四 19:00 公開課線上說明會；週五 10:00 德豐生技線上簡報；週五 16:00 內部週會。`,
    `衝突提醒：週四下午的拜訪結束時間預估 16:00，跟原本 15:30 的線上會議重疊，建議把線上會議往後挪。`,
    `本月準時出席率 91%，目標 95%。`,
  ].join("\n");
}

/** 營運總管 Morgan */
function operationsDemo(): string {
  return [
    `【各產品線現況】全部專案 60 件、已成案 30 件。企業內訓 42 件、公開課程 18 件。` +
      `已送出報價總額 NT$1,863,000，另有草稿 NT$86,000。`,
    `五條產品線：企業內訓（進行中，負責人 Jason，下一步是確認 Q3 三家客戶的課綱與講師排程）；` +
      `公開課程（進行中，負責人 Ivy，8 月梯次開放報名）；AI 導入（規劃中，負責人 Kevin，整理導入評估問卷）；` +
      `一對一陪跑（進行中，本週完成 2 位學員期中檢核）；其他專案（暫停，待資源到位）。`,
    `知識庫本月新增 26 條（月目標 40 條）。`,
    `卡點：AI 導入的評估問卷已經延了兩週，建議這週定案，否則會影響 8 月提案。`,
  ].join("\n");
}

/** 即時監控員 Kevin */
function notifyDemo(): string {
  return [
    `【推播與監控現況】本月推播 1,842 則，準時送達率 96.5%（目標 99%）。`,
    `近期觸發：訂單 #5233 成立即時通知（已送達）；廣告 CPA 超過門檻 20% 警示（已通知主理人）；` +
      `深夜客訴進線提醒（已送達，客服已接手）；GA4 流量異常下降警示（誤報，已調整門檻）。`,
    `異常：本月有 64 則推播延遲超過門檻，集中在晚上 9-10 點的尖峰時段，建議把非緊急推播錯開這個時段。`,
  ].join("\n");
}

/** Team Lead Vivian：全隊彙整 */
function teamleadDemo(): string {
  return [
    `【全隊本週彙整】12 位 Agent 全部值勤中，本週完成任務 604 件（月目標 800 件）。`,
    `各線重點：廣告 ROAS ${ADS_DEMO_STATS.roas}、CPA 連三日上升需要處理；` +
      `自然搜尋點擊 ${nf.format(buildSearchDemo(28).totalClicks)}，比較型字群進步最快；` +
      `社群互動率 ${SOCIAL_DEMO_STATS.avgEngagement}%，敘事型貼文表現最好；` +
      `品牌情緒 ${REPUTATION_DEMO_STATS.sentimentScore} 分，${REPUTATION_DEMO_STATS.pendingNegative} 則負評待回；` +
      `訂單營收 NT$328,500，達成率 66%；客服結案率 52%，回覆時間還沒達標。`,
    `本週三個需要老闆決策的事：一、廣告疲勞素材要不要直接關掉；` +
      `二、AI 導入評估問卷延宕兩週，要不要換人負責；三、客服回覆時間一直卡在 6 分鐘，要不要加開一個時段的自動回覆。`,
    `全隊目標平均達成率 65%，其中 4 個目標需要留意、沒有逾期項目。`,
  ].join("\n");
}

const BUILDERS: Record<string, () => string> = {
  today: todayDemo,
  report: reportDemo,
  expense: expenseDemo,
  card: cardDemo,
  competitor: competitorDemo,
  orders: ordersDemo,
  support: supportDemo,
  visit: visitDemo,
  schedule: scheduleDemo,
  operations: operationsDemo,
  notify: notifyDemo,
  teamlead: teamleadDemo,
};

/**
 * 示範模式下這位 Agent 的業務現況。沒有對應內容時回空字串，
 * 呼叫端會照原本的邏輯讓 Agent 說沒有資料（而不是硬掰）。
 */
export function getAgentDemoContext(slug: string): string {
  return BUILDERS[slug]?.() ?? "";
}
