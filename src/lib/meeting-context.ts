import "server-only";
import { getSupabase } from "@/lib/supabase";
import { listWeekOverview } from "@/lib/google";
import { getSearchOverview } from "@/lib/gsc";
import { getTrafficOverview } from "@/lib/ga4";
import { getOrderRevenueSummary } from "@/lib/teachify-order-stats";
import { getPipelineOverview } from "@/lib/teaching-system";
import { getAvailableTags } from "@/lib/contact-tags";
import { AGENTS } from "@/lib/agent-data";

// 會議室 Agent 人設的「真實資料」補丁：之前只餵了職稱／職掌的靜態說明，
// Agent 自然答不出任何具體記錄（哪怕那筆資料明明存在 Supabase／Google 裡）。
// 這裡依 slug 抓對應的真實資料，格式化成一段文字塞進 instructions；
// 抓不到（例如 Google 憑證未設）就悄悄跳過，不讓整個換 token 流程失敗。

function nameOf(slug: string): string {
  const a = AGENTS.find((x) => x.slug === slug);
  return a ? `${a.personEn} ${a.personZh}` : slug;
}

async function visitContext(): Promise<string> {
  const supabase = getSupabase();
  const parts: string[] = [];

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id,name,company,created_at")
    .eq("source", "line_card")
    .order("created_at", { ascending: false })
    .limit(8);

  if (contacts?.length) {
    const ids = contacts.map((c: { id: string }) => c.id);
    const [{ data: offers }, { data: invites }] = await Promise.all([
      supabase
        .from("visit_offers")
        .select("contact_id,status,created_at")
        .in("contact_id", ids)
        .order("created_at", { ascending: false }),
      supabase
        .from("pending_invites")
        .select("contact_id,status,created_at")
        .in("contact_id", ids)
        .order("created_at", { ascending: false }),
    ]);
    const offerBy = new Map<string, string>();
    (offers ?? []).forEach((o: { contact_id: string; status: string }) => {
      if (!offerBy.has(o.contact_id)) offerBy.set(o.contact_id, o.status);
    });
    const inviteBy = new Map<string, string>();
    (invites ?? []).forEach((i: { contact_id: string; status: string }) => {
      if (!inviteBy.has(i.contact_id)) inviteBy.set(i.contact_id, i.status);
    });
    const lines = contacts.map((c: { id: string; name: string; company: string | null }) => {
      const inv = inviteBy.get(c.id);
      const off = offerBy.get(c.id);
      let outcome = "已辨識，尚未決定是否安排";
      if (inv === "pending" || inv === "sent" || inv === "confirmed") outcome = "已寄出邀約信";
      else if (inv === "awaiting_approval") outcome = "邀約信待核准";
      else if (off === "accepted") outcome = "已確認要安排拜訪";
      else if (off === "declined") outcome = "已回覆不安排";
      else if (off === "pending") outcome = "待客戶回覆";
      return `- ${c.name}${c.company ? `（${c.company}）` : ""}：${outcome}`;
    });
    parts.push(`近期名片與邀約狀況（即「邀約名單」，最新 ${lines.length} 筆）：\n${lines.join("\n")}`);
  }

  try {
    const tags = await getAvailableTags(supabase);
    if (tags.length) parts.push(`目前可用的客戶標籤：${tags.join("、")}`);
  } catch {
    /* 標籤取不到不影響其他部分 */
  }

  return parts.join("\n\n");
}

async function scheduleContext(): Promise<string> {
  const overview = await listWeekOverview();
  const parts: string[] = [];
  const totalEvents = overview.dayCounts.reduce((a, b) => a + b, 0);
  parts.push(`未來七天共 ${totalEvents} 場行程（依日：${overview.dayCounts.join("、")}）。`);
  if (overview.upcoming.length) {
    parts.push(`接下來的行程：\n${overview.upcoming.map((u) => `- ${u.label} ${u.title}`).join("\n")}`);
  }
  if (overview.warnings.length) {
    parts.push(`注意事項：${overview.warnings.join("；")}`);
  }
  return parts.join("\n\n");
}

/** Leo（SEO 助理）用：真實 Search Console 近 28 天成效。 */
async function expenseContext(): Promise<string> {
  const overview = await getSearchOverview();
  const parts: string[] = [];
  parts.push(
    `近 28 天 Search Console 成效：點擊 ${overview.totalClicks} 次、曝光 ${overview.totalImpressions} 次、` +
      `平均點擊率 ${(overview.avgCtr * 100).toFixed(1)}%、平均排名第 ${overview.avgPosition.toFixed(1)} 名` +
      (overview.clicksDelta !== null
        ? `（跟前 28 天相比，點擊${overview.clicksDelta >= 0 ? "增加" : "減少"} ${Math.abs(overview.clicksDelta)} 次，` +
          `排名${overview.positionDelta! >= 0 ? "進步" : "退步"} ${Math.abs(overview.positionDelta!).toFixed(1)} 名）`
        : "") +
      "。"
  );
  if (overview.topQueries.length) {
    parts.push(
      `熱門搜尋字詞：\n${overview.topQueries
        .slice(0, 8)
        .map((q) => `- ${q.query}：點擊 ${q.clicks}、曝光 ${q.impressions}、排名第 ${q.position.toFixed(1)} 名`)
        .join("\n")}`
    );
  }
  return parts.join("\n\n");
}

/** Ivy（數據助理）用：真實 GA4 流量與 Teachify 訂單營收，兩者放在一起才看得出「流量有沒有轉換成營收」。 */
async function reportContext(): Promise<string> {
  const parts: string[] = [];

  try {
    const traffic = await getTrafficOverview();
    parts.push(
      `近 7 天 GA4 流量：工作階段數 ${traffic.sessions}、活躍使用者 ${traffic.activeUsers}、轉換 ${traffic.conversions} 次` +
        (traffic.sessionsDelta !== null
          ? `（跟前 7 天相比${traffic.sessionsDelta >= 0 ? "成長" : "下滑"} ${Math.abs(traffic.sessionsDelta)} 次工作階段）`
          : "") +
        "。"
    );
    if (traffic.byChannel.length) {
      parts.push(
        `渠道拆分：\n${traffic.byChannel
          .map((c) => `- ${c.channel}：工作階段 ${c.sessions}、轉換 ${c.conversions}`)
          .join("\n")}`
      );
    }
  } catch {
    /* GA4 抓不到不影響訂單資料 */
  }

  try {
    const orders = await getOrderRevenueSummary(7);
    parts.push(
      `近 7 天 Teachify 訂單：成立 ${orders.totalOrders} 筆、總營收 NT$${orders.totalRevenue.toLocaleString()}` +
        (orders.refundCount > 0 ? `，另有 ${orders.refundCount} 筆退款共 NT$${orders.refundAmount.toLocaleString()}` : "") +
        "。"
    );
    if (orders.topItems.length) {
      parts.push(
        `熱銷品項：\n${orders.topItems
          .map((it) => `- ${it.name}：${it.count} 筆、NT$${it.revenue.toLocaleString()}`)
          .join("\n")}`
      );
    }
  } catch {
    /* Teachify 訂單資料抓不到不影響流量資料 */
  }

  return parts.join("\n\n");
}

/** Morgan（營運總管）用：真實企業內訓／公開課程／企業顧問洽詢／報價單現況（來自「教學系統」資料庫）。 */
async function operationsContext(): Promise<string> {
  const overview = await getPipelineOverview();
  const parts: string[] = [];

  parts.push(
    `專案總覽：全部 ${overview.totalProjects} 個專案，${overview.closedProjects} 個已成案（企業內訓 ${overview.enterpriseTrainingCount} 個、公開課程 ${overview.publicCourseCount} 個）。`
  );
  if (overview.recentProjects.length) {
    parts.push(
      `最近的專案：\n${overview.recentProjects
        .slice(0, 6)
        .map((p) => `- ${p.name}（${p.organization}）：${p.closed ? `已成案 ×${p.sessionCount} 場` : "尚未成案"}`)
        .join("\n")}`
    );
  }
  parts.push(
    `企業顧問洽詢：共 ${overview.totalInquiries} 筆，${overview.openInquiries.length} 筆待跟進` +
      (overview.openInquiries.length
        ? `（例如：${overview.openInquiries
            .slice(0, 3)
            .map((i) => `${i.name}${i.company ? `／${i.company}` : ""}`)
            .join("、")}）`
        : "") +
      "。"
  );
  parts.push(
    `報價單：已送出金額 NT$${overview.quotationsSentValue.toLocaleString()}` +
      (overview.quotationsDraftValue ? `，另有草稿 NT$${overview.quotationsDraftValue.toLocaleString()}` : "") +
      "。"
  );

  return parts.join("\n\n");
}

async function teamleadContext(): Promise<string> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("line_agent_activity")
    .select("agent_slug,status,summary,occurred_at")
    .gte("occurred_at", cutoff)
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (!rows?.length) return "";

  const byAgent = new Map<string, number>();
  let failed = 0;
  rows.forEach((r: { agent_slug: string | null; status: string }) => {
    if (r.status === "failed") failed++;
    if (r.agent_slug) byAgent.set(r.agent_slug, (byAgent.get(r.agent_slug) ?? 0) + 1);
  });
  const top = [...byAgent.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slug, count]) => `${nameOf(slug)} ${count} 項`)
    .join("、");
  const recentLines = rows.slice(0, 8).map((r: { summary: string }) => `- ${r.summary}`).join("\n");

  return (
    `過去 24 小時全隊共 ${rows.length} 項動態，${failed} 項異常。依成員分佈：${top}。\n\n` +
    `近期動態摘要：\n${recentLines}`
  );
}

/** 這位 Agent 自己過去 7 天的真實動態紀錄（不論哪個 slug 都試著撈，是所有人都能用的基本盤）。 */
async function ownRecentActivity(slug: string): Promise<string> {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("line_agent_activity")
    .select("summary,occurred_at")
    .eq("agent_slug", slug)
    .gte("occurred_at", cutoff)
    .order("occurred_at", { ascending: false })
    .limit(10);
  if (!rows?.length) return "";
  return `你自己過去 7 天的真實動態紀錄：\n${rows.map((r: { summary: string }) => `- ${r.summary}`).join("\n")}`;
}

/**
 * 依 Agent slug 抓真實業務資料，格式化成一段文字給 mintRealtimeSession 塞進
 * instructions。全部 best-effort：任何一段抓不到就跳過那段，不讓整個
 * 換 token 流程失敗；抓不到任何資料就回空字串，讓上層照實告訴老闆
 * 「目前沒有串接到真實資料」而不是瞎編。
 */
export async function getAgentLiveContext(slug: string): Promise<string> {
  const parts: string[] = [];

  try {
    if (slug === "visit") parts.push(await visitContext());
    else if (slug === "schedule") parts.push(await scheduleContext());
    else if (slug === "teamlead") parts.push(await teamleadContext());
    else if (slug === "expense") parts.push(await expenseContext());
    else if (slug === "report") parts.push(await reportContext());
    else if (slug === "operations") parts.push(await operationsContext());
  } catch {
    /* 該 Agent 專屬的資料來源掛了，不影響下面的通用近期動態 */
  }

  try {
    parts.push(await ownRecentActivity(slug));
  } catch {
    /* ignore */
  }

  return parts.filter(Boolean).join("\n\n");
}
