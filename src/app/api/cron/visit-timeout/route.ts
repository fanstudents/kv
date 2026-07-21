import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pushLineMessage } from "@/lib/line";
import { releaseLock } from "@/lib/conversation-lock";
import { addContactTag } from "@/lib/contact-tags";
import { setLiveTask } from "@/lib/live-task-store";

// 約拜訪逾時自動判斷：名片辨識後 3 分鐘還沒回「要／不要」→ 依設定「一律先略過」，
// 標記客戶「待跟進」存起來、通知使用者，不自動寄邀約。
// 由外部排程器每 1～2 分鐘呼叫一次（帶 x-cron-key）。
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = Date.now();
  // 只處理「3 分鐘前～20 分鐘內」的待決定名片，避免波及更早的歷史資料
  const olderThan = new Date(now - 3 * 60 * 1000).toISOString();
  const notOlderThan = new Date(now - 20 * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from("visit_offers")
    .select("id, line_user_id, contact_id, contacts(name)")
    .eq("status", "pending")
    .lt("created_at", olderThan)
    .gt("created_at", notOlderThan)
    .limit(20);

  let handled = 0;
  for (const offer of stale ?? []) {
    const name = (offer.contacts as { name?: string } | null)?.name ?? "這位客戶";

    await supabase
      .from("visit_offers")
      .update({ status: "declined", resolved_at: new Date().toISOString() })
      .eq("id", offer.id);

    if (offer.contact_id) await addContactTag(supabase, offer.contact_id, "待跟進");

    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `名片「${name}」逾時未回覆（3 分鐘），已自動略過並標記「待跟進」`,
      status: "success",
    });

    await setLiveTask("visit", {
      step: 2,
      status: "done",
      caption: `逾時未回覆，已標記待跟進（${name}）`,
    });

    if (offer.line_user_id) {
      await pushLineMessage(
        offer.line_user_id,
        `名片「${name}」等了 3 分鐘沒收到你的指示，我先幫你標記「待跟進」存起來了 📌\n要安排拜訪的話再跟我說，或重新傳一次名片即可。`
      ).catch(() => {});
      await releaseLock(supabase, offer.line_user_id, "visit").catch(() => {});
    }

    handled++;
  }

  return NextResponse.json({ ok: true, handled });
}
