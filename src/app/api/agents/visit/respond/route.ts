import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createCalendarEvent, sendGmail } from "@/lib/google";
import { pushLineMessage } from "@/lib/line";
import { buildThankYouEmailHtml, escapeHtml } from "@/lib/email-templates";
import { getVisitAgentSettings } from "@/lib/visit-settings";

function page(title: string, message: string, tone: "success" | "error" = "success") {
  const accent = tone === "success" ? "#06C755" : "#EF4444";
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:420px;width:90%;background:#ffffff;border-radius:12px;padding:32px 28px;text-align:center;">
    <div style="width:48px;height:48px;border-radius:50%;background:${accent};margin:0 auto 16px;"></div>
    <h1 style="font-size:18px;color:#27272a;margin:0 0 12px;">${escapeHtml(title)}</h1>
    <p style="font-size:14px;color:#52525b;line-height:1.7;margin:0;">${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  const inviteId = req.nextUrl.searchParams.get("invite");
  const choice = req.nextUrl.searchParams.get("choice");

  if (!inviteId || !choice || !["1", "2", "both"].includes(choice)) {
    return page("連結無效", "這個邀約連結不完整，請直接聯繫對方確認時間。", "error");
  }

  const supabase = getSupabase();

  const { data: claimed } = await supabase
    .from("pending_invites")
    .update({ status: "confirmed", chosen_slot: choice, resolved_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending")
    .select("*, contacts(name, email, company)")
    .maybeSingle();

  if (!claimed) {
    return page("已經確認過囉", "這個邀約先前已經回覆過時段了，如需更改時間請直接聯繫對方。");
  }

  const contact = claimed.contacts as { name?: string; email?: string; company?: string } | null;
  const chosenStart = choice === "2" ? claimed.slot2_start : claimed.slot1_start;
  const chosenEnd = choice === "2" ? claimed.slot2_end : claimed.slot1_end;
  const chosenLabel: string = choice === "2" ? claimed.slot2 : claimed.slot1;
  const contactName = contact?.name || "對方";

  try {
    const settings = await getVisitAgentSettings(supabase);
    const eventId = await createCalendarEvent({
      summary: `${settings.senderName} 拜訪 ${contactName}${contact?.company ? `（${contact.company}）` : ""}`,
      description: `由 ${settings.senderName} 透過約拜訪 Agent 安排的${settings.meetingType}，對象：${contactName}${
        contact?.company ? ` / ${contact.company}` : ""
      }。`,
      startISO: chosenStart,
      endISO: chosenEnd,
      attendeeEmail: claimed.to_email,
    });

    await supabase.from("pending_invites").update({ calendar_event_id: eventId }).eq("id", inviteId);

    await sendGmail({
      to: claimed.to_email,
      subject: `已確認見面時間：${chosenLabel}`,
      body: buildThankYouEmailHtml({
        contactName,
        senderName: settings.senderName,
        chosenLabel,
      }),
      html: true,
    });

    await pushLineMessage(
      claimed.line_user_id,
      `🎉 ${contactName}已選擇 ${chosenLabel}，已自動建立行事曆邀請並寄出感謝信給對方。`
    ).catch(() => {});

    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `${contactName} 已確認 ${chosenLabel}，行事曆邀請與感謝信已寄出`,
      status: "success",
    });

    return page("時段已確認！", `已為您安排 ${chosenLabel}，行事曆邀請與確認信都已經寄到您的信箱囉，謝謝您！`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "建立行事曆或寄信失敗";
    await supabase.from("pending_invites").update({ status: "failed" }).eq("id", inviteId);
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `對方確認時段後，自動排程失敗：${message}`,
      status: "failed",
    });
    await pushLineMessage(
      claimed.line_user_id,
      `⚠️ ${contactName}選了 ${chosenLabel}，但自動安排行事曆時發生問題，請手動確認並聯繫對方。`
    ).catch(() => {});

    return page(
      "時段已收到",
      "已經記錄您選擇的時間，但系統自動安排時發生了一點問題，對方會再與您確認，造成不便請見諒。",
      "error"
    );
  }
}
