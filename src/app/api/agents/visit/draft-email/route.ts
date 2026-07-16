import { NextRequest, NextResponse } from "next/server";
import { draftInviteEmail } from "@/lib/openai";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
  const company = typeof body.company === "string" ? body.company : "";
  const meetingType = typeof body.meetingType === "string" ? body.meetingType : "喝咖啡";
  const slot1 = typeof body.slot1 === "string" ? body.slot1 : "";
  const slot2 = typeof body.slot2 === "string" ? body.slot2 : "";
  const senderName = typeof body.senderName === "string" ? body.senderName : "";

  if (!contactName) {
    return NextResponse.json({ error: "缺少收件人姓名" }, { status: 400 });
  }
  if (!slot1 || !slot2) {
    return NextResponse.json({ error: "缺少建議時段" }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    const draft = await draftInviteEmail({ contactName, company, meetingType, slot1, slot2, senderName });
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `已用 AI 產生邀約信草稿給 ${contactName}`,
      status: "success",
    });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "邀約信生成失敗";
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `AI 產生邀約信失敗：${message}`,
      status: "failed",
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
