import { NextRequest, NextResponse } from "next/server";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { getSupabase } from "@/lib/supabase";

const VALID_STYLES: PushStyle[] = ["text", "flex", "confirm", "buttons"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const style: PushStyle = VALID_STYLES.includes(body.style) ? body.style : "text";
  const title = typeof body.title === "string" && body.title ? body.title : "通知";
  const accentColor =
    typeof body.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.accentColor)
      ? body.accentColor
      : "#06C755";

  if (!to) {
    return NextResponse.json({ error: "缺少測試對象 LINE User ID" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "缺少要推播的訊息內容" }, { status: 400 });
  }

  const supabase = getSupabase();
  const styleLabel = { text: "純文字", flex: "Flex 卡片", confirm: "確認按鈕", buttons: "按鈕選單" }[style];

  try {
    await pushLineRawMessages(to, buildPushMessages({ style, text, title, accentColor }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: slug,
      summary: `測試推播失敗（${styleLabel}）：${message}`,
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data } = await supabase
    .from("line_agent_activity")
    .insert({
      agent_slug: slug,
      summary: `已透過 LINE Messaging API 送出測試推播（${styleLabel}樣式）`,
      status: "success",
    })
    .select()
    .single();

  return NextResponse.json({ ok: true, activity: data });
}
