import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createCalendarEvent, sendGmail } from "@/lib/google";
import { pushLineMessage } from "@/lib/line";
import { buildThankYouEmailHtml, escapeHtml } from "@/lib/email-templates";
import { getVisitAgentSettings } from "@/lib/visit-settings";

type ContactInfo = { name?: string; title?: string; email?: string; company?: string } | null;

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

function locationFormPage(params: { inviteId: string; chosenLabel: string }) {
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>時段已記錄</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:420px;width:90%;background:#ffffff;border-radius:12px;padding:32px 28px;">
    <div style="width:48px;height:48px;border-radius:50%;background:#06C755;margin:0 auto 16px;"></div>
    <h1 style="font-size:18px;color:#27272a;margin:0 0 8px;text-align:center;">時段已記錄 ☕</h1>
    <p style="font-size:14px;color:#52525b;line-height:1.7;margin:0 0 20px;text-align:center;">
      已為您安排 <strong>${escapeHtml(params.chosenLabel)}</strong>，方便的話留下想約的地點吧！
    </p>
    <form method="POST" action="/api/agents/visit/respond?invite=${encodeURIComponent(params.inviteId)}">
      <label style="display:block;font-size:13px;color:#71717a;margin-bottom:6px;">地點（選填）</label>
      <input
        type="text"
        name="location"
        maxlength="100"
        placeholder="例如：公司附近咖啡廳，或您喜歡的地方"
        style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #d4d4d8;border-radius:8px;font-size:14px;margin-bottom:16px;"
      />
      <button
        type="submit"
        style="width:100%;padding:14px;background:#06C755;color:#ffffff;border:none;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;"
      >
        確認送出
      </button>
    </form>
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;text-align:center;">沒有特別偏好的話，留白直接送出也沒問題</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function chosenSlotFields(row: {
  chosen_slot: string | null;
  slot1: string;
  slot2: string;
  slot1_start: string;
  slot1_end: string;
  slot2_start: string;
  slot2_end: string;
}) {
  const useSlot2 = row.chosen_slot === "2";
  return {
    label: useSlot2 ? row.slot2 : row.slot1,
    startISO: useSlot2 ? row.slot2_start : row.slot1_start,
    endISO: useSlot2 ? row.slot2_end : row.slot1_end,
  };
}

export async function GET(req: NextRequest) {
  const inviteId = req.nextUrl.searchParams.get("invite");
  const choice = req.nextUrl.searchParams.get("choice");
  const supabase = getSupabase();

  if (!inviteId) {
    return page("連結無效", "這個邀約連結不完整，請直接聯繫對方確認時間。", "error");
  }

  const { data: existing } = await supabase.from("pending_invites").select("*").eq("id", inviteId).maybeSingle();
  if (!existing) {
    return page("連結無效", "找不到這個邀約，請直接聯繫對方確認時間。", "error");
  }

  let row = existing;

  if (row.status === "pending") {
    if (!choice || !["1", "2", "both"].includes(choice)) {
      return page("連結無效", "這個邀約連結不完整，請直接聯繫對方確認時間。", "error");
    }
    const { data: claimed } = await supabase
      .from("pending_invites")
      .update({ status: "confirmed", chosen_slot: choice, resolved_at: new Date().toISOString() })
      .eq("id", inviteId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimed) {
      row = claimed;
    } else {
      const { data: refetched } = await supabase.from("pending_invites").select("*").eq("id", inviteId).single();
      row = refetched;
    }
  }

  if (row.status === "confirmed" && !row.calendar_event_id) {
    const { label } = chosenSlotFields(row);
    return locationFormPage({ inviteId, chosenLabel: label });
  }

  if (row.status === "confirmed" && row.calendar_event_id) {
    const { label } = chosenSlotFields(row);
    return page("已經確認過囉", `這個邀約先前已經確認為 ${label}，如需更改時間請直接聯繫對方。`);
  }

  return page("已經確認過囉", "這個邀約先前已經處理過了，如需更改時間請直接聯繫對方。");
}

export async function POST(req: NextRequest) {
  const inviteId = req.nextUrl.searchParams.get("invite");
  const supabase = getSupabase();

  if (!inviteId) {
    return page("連結無效", "這個邀約連結不完整，請直接聯繫對方確認時間。", "error");
  }

  const formData = await req.formData().catch(() => null);
  const rawLocation = typeof formData?.get("location") === "string" ? (formData.get("location") as string) : "";
  const location = rawLocation.trim().slice(0, 100) || undefined;

  const { data: row } = await supabase.from("pending_invites").select("*, contacts(name, title, email, company)").eq("id", inviteId).maybeSingle();

  if (!row) {
    return page("連結無效", "找不到這個邀約，請直接聯繫對方確認時間。", "error");
  }

  if (row.status !== "confirmed" || row.calendar_event_id) {
    const { label } = chosenSlotFields(row);
    return page("已經確認過囉", `這個邀約先前已經確認為 ${label}，如需更改時間請直接聯繫對方。`);
  }

  const contact = row.contacts as ContactInfo;
  const contactName = contact?.name || "對方";
  const { label: chosenLabel, startISO, endISO } = chosenSlotFields(row);

  try {
    const settings = await getVisitAgentSettings(supabase);
    const eventId = await createCalendarEvent({
      summary: `${settings.senderName} 拜訪 ${contactName}${contact?.company ? `（${contact.company}）` : ""}`,
      description: `由 ${settings.senderName} 透過約拜訪 Agent 安排的${settings.meetingType}，對象：${contactName}${
        contact?.company ? ` / ${contact.company}` : ""
      }。`,
      location,
      startISO,
      endISO,
      attendeeEmail: row.to_email,
    });

    await supabase.from("pending_invites").update({ calendar_event_id: eventId, location: location ?? null }).eq("id", inviteId);

    await sendGmail({
      to: row.to_email,
      subject: `已確認見面時間：${chosenLabel}`,
      body: buildThankYouEmailHtml({
        contactName,
        senderName: settings.senderName,
        chosenLabel,
        location,
      }),
      html: true,
    });

    await pushLineMessage(
      row.line_user_id,
      `🎉 ${contactName}已選擇 ${chosenLabel}${location ? `，地點：${location}` : ""}，已自動建立行事曆邀請並寄出感謝信給對方。`
    ).catch(() => {});

    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `${contactName} 已確認 ${chosenLabel}${location ? `（地點：${location}）` : ""}，行事曆邀請與感謝信已寄出`,
      status: "success",
    });

    return page(
      "時段已確認！",
      `已為您安排 ${chosenLabel}${location ? `，地點約在 ${location}` : ""}，行事曆邀請與確認信都已經寄到您的信箱囉，謝謝您！`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "建立行事曆或寄信失敗";
    await supabase.from("pending_invites").update({ status: "failed" }).eq("id", inviteId);
    await supabase.from("line_agent_activity").insert({
      agent_slug: "visit",
      summary: `對方確認時段後，自動排程失敗：${message}`,
      status: "failed",
    });
    await pushLineMessage(
      row.line_user_id,
      `⚠️ ${contactName}選了 ${chosenLabel}，但自動安排行事曆時發生問題，請手動確認並聯繫對方。`
    ).catch(() => {});

    return page(
      "時段已收到",
      "已經記錄您選擇的時間，但系統自動安排時發生了一點問題，對方會再與您確認，造成不便請見諒。",
      "error"
    );
  }
}
