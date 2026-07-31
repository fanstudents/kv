import {
  normalizeVisitLocation,
  parseVisitInviteChoice,
  selectVisitInviteSlot,
} from "@/modules/visit/public-response";
import type {
  VisitRespondFulfilmentSource,
  VisitRespondReadSource,
  VisitRespondResearchInput,
} from "@/modules/visit/respond-contracts";

export type VisitPublicInvitePage =
  | {
      kind: "message";
      title: string;
      message: string;
      tone?: "success" | "error";
    }
  | {
      kind: "location-form";
      inviteId: string;
      chosenLabel: string;
    };

export interface VisitPublicInviteBackgroundResearch {
  input: VisitRespondResearchInput;
  lineUserId: string;
  notificationText: string;
}

export interface VisitPublicInvitePostResult {
  page: VisitPublicInvitePage;
}

type VisitRespondContact = {
  name?: string;
  title?: string;
  email?: string;
  company?: string;
} | null;

type ThankYouEmailRenderer = (params: {
  contactName: string;
  senderName: string;
  chosenLabel: string;
  location?: string;
}) => string;

function invalidInvitePage(): VisitPublicInvitePage {
  return {
    kind: "message",
    title: "連結無效",
    message: "這個邀約連結不完整，請直接聯繫對方確認時間。",
    tone: "error",
  };
}

function missingInvitePage(): VisitPublicInvitePage {
  return {
    kind: "message",
    title: "連結無效",
    message: "找不到這個邀約，請直接聯繫對方確認時間。",
    tone: "error",
  };
}

function alreadyHandledPage(label?: string): VisitPublicInvitePage {
  return {
    kind: "message",
    title: "已經確認過囉",
    message: label
      ? `這個邀約先前已經確認為 ${label}，如需更改時間請直接聯繫對方。`
      : "這個邀約先前已經處理過了，如需更改時間請直接聯繫對方。",
  };
}

export async function resolveVisitPublicInviteGet(params: {
  inviteId: string | null;
  choiceValue: string | null;
  read: VisitRespondReadSource;
  nowIso: () => string;
}): Promise<VisitPublicInvitePage> {
  const { inviteId, choiceValue, read, nowIso } = params;
  const choice = parseVisitInviteChoice(choiceValue);

  if (!inviteId) return invalidInvitePage();

  const existing = await read.findInvite(inviteId);
  if (!existing) return missingInvitePage();

  let row = existing;
  if (row.status === "pending") {
    if (!choice) return invalidInvitePage();

    const claimed = await read.confirmInvite(inviteId, choice, nowIso());
    row = claimed ?? (await read.refetchInvite(inviteId));
  }

  if (row.status === "confirmed" && !row.calendar_event_id) {
    return {
      kind: "location-form",
      inviteId,
      chosenLabel: selectVisitInviteSlot(row).label,
    };
  }

  if (row.status === "confirmed" && row.calendar_event_id) {
    return alreadyHandledPage(selectVisitInviteSlot(row).label);
  }

  return alreadyHandledPage();
}

export async function fulfilVisitPublicInvite(params: {
  inviteId: string | null;
  locationValue: FormDataEntryValue | null;
  read: VisitRespondReadSource;
  fulfilment: VisitRespondFulfilmentSource;
  renderThankYouEmail: ThankYouEmailRenderer;
  scheduleBackgroundResearch?: (work: VisitPublicInviteBackgroundResearch) => void;
}): Promise<VisitPublicInvitePostResult> {
  const {
    inviteId,
    locationValue,
    read,
    fulfilment,
    renderThankYouEmail,
    scheduleBackgroundResearch,
  } = params;
  if (!inviteId) return { page: invalidInvitePage() };

  const location = normalizeVisitLocation(locationValue);
  const row = await read.findInviteForFulfilment(inviteId);
  if (!row) return { page: missingInvitePage() };

  if (row.status !== "confirmed" || row.calendar_event_id) {
    return { page: alreadyHandledPage(selectVisitInviteSlot(row).label) };
  }

  const contact = row.contacts as VisitRespondContact;
  const contactName = contact?.name || "對方";
  const { label: chosenLabel, startISO, endISO } = selectVisitInviteSlot(row);

  try {
    const settings = await fulfilment.getSettings();
    const eventId = await fulfilment.createCalendarEvent({
      summary: `${settings.senderName} 拜訪 ${contactName}${contact?.company ? `（${contact.company}）` : ""}`,
      description: `由 ${settings.senderName} 透過約拜訪 Agent 安排的${settings.meetingType}，對象：${contactName}${
        contact?.company ? ` / ${contact.company}` : ""
      }。`,
      location,
      startISO,
      endISO,
      attendeeEmail: row.to_email,
    });

    await fulfilment.updateInviteFulfilled(inviteId, eventId, location);
    await fulfilment.sendThankYouEmail({
      to: row.to_email,
      subject: `已確認見面時間：${chosenLabel}`,
      body: renderThankYouEmail({
        contactName,
        senderName: settings.senderName,
        chosenLabel,
        location,
      }),
      html: true,
    });

    await fulfilment.pushLineMessage(
      row.line_user_id,
      `🎉 ${contactName}已選擇 ${chosenLabel}${location ? `，地點：${location}` : ""}，已自動建立行事曆邀請並寄出感謝信給對方。`
    ).catch(() => {});

    await fulfilment.recordActivity({
      agent_slug: "visit",
      summary: `${contactName} 已確認 ${chosenLabel}${location ? `（地點：${location}）` : ""}，行事曆邀請與感謝信已寄出`,
      status: "success",
    });

    const backgroundResearch = contact?.name
      ? {
          input: {
            contactId: row.contact_id ?? null,
            inviteId,
            name: contact.name,
            company: contact.company ?? null,
            title: contact.title ?? null,
            email: row.to_email ?? null,
          },
          lineUserId: row.line_user_id,
          notificationText: `🔎 我順手查了 ${contactName}${contact.company ? `與 ${contact.company}` : ""} 的公開資料，行前功課整理好了——在「約拜訪」頁面可以看到公司近況、社群連結與可以聊的切入點。`,
        }
      : undefined;

    if (backgroundResearch) scheduleBackgroundResearch?.(backgroundResearch);

    return {
      page: {
        kind: "message",
        title: "時段已確認！",
        message: `已為您安排 ${chosenLabel}${location ? `，地點約在 ${location}` : ""}，行事曆邀請與確認信都已經寄到您的信箱囉，謝謝您！`,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立行事曆或寄信失敗";
    await fulfilment.markInviteFailed(inviteId);
    await fulfilment.recordActivity({
      agent_slug: "visit",
      summary: `對方確認時段後，自動排程失敗：${message}`,
      status: "failed",
    });
    await fulfilment.pushLineMessage(
      row.line_user_id,
      `⚠️ ${contactName}選了 ${chosenLabel}，但自動安排行事曆時發生問題，請手動確認並聯繫對方。`
    ).catch(() => {});

    return {
      page: {
        kind: "message",
        title: "時段已收到",
        message: "已經記錄您選擇的時間，但系統自動安排時發生了一點問題，對方會再與您確認，造成不便請見諒。",
        tone: "error",
      },
    };
  }
}
