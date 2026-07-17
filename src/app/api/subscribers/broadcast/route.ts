import { NextRequest, NextResponse } from "next/server";
import { pushLineRawMessages, type LineChannel } from "@/lib/line";
import { buildPushMessages, type PushStyle } from "@/lib/line-message-styles";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("broadcast_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tags: string[] = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [];
  const channelFilter: LineChannel | "all" = ["primary", "support"].includes(body.channel) ? body.channel : "all";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const style: PushStyle = ["text", "flex", "confirm", "buttons"].includes(body.style) ? body.style : "text";
  const title = typeof body.title === "string" && body.title ? body.title : "團隊公告";
  const accentColor =
    typeof body.accentColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.accentColor) ? body.accentColor : "#06C755";

  if (!text) {
    return NextResponse.json({ error: "缺少要推播的訊息內容" }, { status: 400 });
  }

  const supabase = getSupabase();

  let query = supabase.from("line_subscribers").select("id, line_user_id, channel");
  if (tags.length > 0) query = query.overlaps("tags", tags);
  if (channelFilter !== "all") query = query.eq("channel", channelFilter);

  const { data: recipients, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ error: "沒有符合條件的訂閱者" }, { status: 400 });
  }

  const results = await Promise.allSettled(
    recipients.map((r) =>
      pushLineRawMessages(r.line_user_id, buildPushMessages({ style, text, title, accentColor }), r.channel as LineChannel)
    )
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failedCount = results.length - successCount;

  await supabase.from("broadcast_logs").insert({
    tag_filter: tags.length > 0 ? tags.join(",") : null,
    channel_filter: channelFilter === "all" ? null : channelFilter,
    message_style: style,
    message_text: text,
    recipient_count: recipients.length,
    success_count: successCount,
    failed_count: failedCount,
  });

  return NextResponse.json({ ok: true, recipientCount: recipients.length, successCount, failedCount });
}
