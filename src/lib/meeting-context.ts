import "server-only";
import { getSupabase } from "@/lib/supabase";
import { listWeekOverview } from "@/lib/google";
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
