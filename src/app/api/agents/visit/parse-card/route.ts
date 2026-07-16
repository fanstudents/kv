import { NextRequest, NextResponse } from "next/server";
import { parseBusinessCard } from "@/lib/openai";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";

  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "缺少有效的名片圖片" }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    const contact = await parseBusinessCard(imageDataUrl);
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `已辨識名片：${contact.name || "（未辨識出姓名）"}${contact.company ? ` / ${contact.company}` : ""}`,
      status: "success",
    });
    return NextResponse.json({ contact });
  } catch (err) {
    const message = err instanceof Error ? err.message : "名片辨識失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `名片辨識失敗：${message}`,
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
