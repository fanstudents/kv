import { NextResponse } from "next/server";
import { formatOrderText, type NormalizedOrder } from "@/lib/teachify-orders";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { getSupabase } from "@/lib/supabase";

// 用一筆示範訂單（欄位結構取自真實 Teachify 訂單）測試通知樣式是否正常
const DEMO_ORDER: NormalizedOrder = {
  id: "demo",
  tradeNo: "DEN26071757D27ECED16",
  amount: 2180,
  currency: "TWD",
  userName: "黃晴",
  userEmail: "sonia8265@gmail.com",
  itemNames: ["Claude 實戰工作坊課程 - 7/19(日) 13:00~17:00 台中席次"],
  couponCode: null,
  isRefund: false,
  paidAt: new Date().toISOString(),
};

export async function POST() {
  const supabase = getSupabase();

  const { data: agentRow } = await supabase.from("line_agents").select("settings").eq("slug", "orders").single();
  const settings = (agentRow?.settings ?? {}) as Record<string, unknown>;
  const reportTo = typeof settings.reportTo === "string" ? settings.reportTo.trim() : "";
  const pushStyle: PushStyle = ["text", "flex", "confirm", "buttons"].includes(settings.pushStyle as string)
    ? (settings.pushStyle as PushStyle)
    : "flex";

  if (!reportTo) {
    return NextResponse.json({ error: "尚未設定通知對象，請先在下方填入 LINE User ID 並儲存設定" }, { status: 400 });
  }

  try {
    await pushLineRawMessages(
      reportTo,
      buildPushMessages({ style: pushStyle, text: formatOrderText(DEMO_ORDER), title: "新訂單通知（測試）", accentColor: "#F59E0B" })
    );
    await supabase.from("line_agent_activity").insert({
      agent_slug: "orders",
      summary: "已送出測試訂單通知",
      status: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "orders",
      summary: `測試訂單通知失敗：${message}`,
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "測試通知已送出，請查看 LINE" });
}
