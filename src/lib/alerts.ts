import "server-only";
import { getSupabase } from "@/lib/supabase";
import { pushLineMessage } from "@/lib/line";

// 營運告警：排程掛掉、佇列卡住、憑證失效這類「沒人會主動去看」的事，要主動找到人。
//
// 之前的狀況是：GitHub Actions 的 curl 失敗只會讓那個 workflow 紅一下，
// 沒有任何人會收到通知——晨報連續三天沒發出去，也要等老闆自己發現。
//
// 送到哪：優先用 ALERT_LINE_USER_ID，沒設定就用總管 Agent 的匯報對象（reportTo），
// 因為那本來就是「這個系統該向誰報告」的答案，不需要再設一個。

async function alertTarget(): Promise<string | null> {
  const explicit = process.env.ALERT_LINE_USER_ID?.trim();
  if (explicit) return explicit;

  try {
    const { data } = await getSupabase()
      .from("line_agents")
      .select("settings")
      .eq("slug", "teamlead")
      .maybeSingle();
    const reportTo = (data?.settings as Record<string, unknown> | null)?.reportTo;
    return typeof reportTo === "string" && reportTo.trim() ? reportTo.trim() : null;
  } catch (err) {
    console.error("[alerts] 找不到告警對象", err);
    return null;
  }
}

/**
 * 送一則營運告警。永遠不丟例外——告警機制自己壞掉不該把主流程一起帶走，
 * 但一定會留 console.error，不然就變成「告警的告警」也是靜音的。
 */
export async function alertOps(title: string, detail: string): Promise<void> {
  console.error(`[alert] ${title}：${detail}`);
  try {
    const target = await alertTarget();
    if (!target) return;
    const stamp = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    await pushLineMessage(target, `⚠️ ${title}\n\n${detail.slice(0, 800)}\n\n${stamp}`);
  } catch (err) {
    console.error("[alerts] 告警推播失敗", err);
  }
}
