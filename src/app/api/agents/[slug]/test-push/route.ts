import { NextRequest, NextResponse } from "next/server";
import { pushLineMessage } from "@/lib/line";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";

  if (!to) {
    return NextResponse.json({ error: "缺少測試對象 LINE User ID" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "缺少要推播的訊息內容" }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    await pushLineMessage(to, text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "推播失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: slug,
      summary: `測試推播失敗：${message}`,
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data } = await supabase
    .from("line_agent_activity")
    .insert({
      agent_slug: slug,
      summary: "已透過 LINE Messaging API 送出測試推播",
      status: "success",
    })
    .select()
    .single();

  return NextResponse.json({ ok: true, activity: data });
}
