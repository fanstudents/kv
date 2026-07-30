export interface LiveTaskHistoryRequest {
  agentSlug: string;
}

export interface LiveTaskHistoryContact {
  id: string;
  name: string;
  company: string | null;
  createdAt: string;
}

export interface LiveTaskHistoryRelation {
  contactId: string;
  status: string;
  createdAt: string;
}

export interface LiveTaskHistoryItem {
  name: string;
  company: string | null;
  outcome: string;
  at: string;
}

export function parseLiveTaskHistoryRequest(agent: unknown): LiveTaskHistoryRequest {
  return { agentSlug: typeof agent === "string" ? agent : "" };
}

export function summarizeLiveTaskHistory(
  contacts: LiveTaskHistoryContact[],
  offers: LiveTaskHistoryRelation[],
  invites: LiveTaskHistoryRelation[],
): LiveTaskHistoryItem[] {
  const offerBy = new Map<string, string>();
  offers.forEach((offer) => {
    if (!offerBy.has(offer.contactId)) offerBy.set(offer.contactId, offer.status);
  });

  const inviteBy = new Map<string, string>();
  invites.forEach((invite) => {
    if (!inviteBy.has(invite.contactId)) inviteBy.set(invite.contactId, invite.status);
  });

  return contacts.map((contact) => {
    const inviteStatus = inviteBy.get(contact.id);
    const offerStatus = offerBy.get(contact.id);
    let outcome = "已辨識";
    if (inviteStatus === "pending" || inviteStatus === "sent" || inviteStatus === "confirmed") {
      outcome = "已寄邀約";
    } else if (inviteStatus === "awaiting_approval") {
      outcome = "待核准";
    } else if (offerStatus === "accepted") {
      outcome = "已確認";
    } else if (offerStatus === "declined") {
      outcome = "未安排";
    } else if (offerStatus === "pending") {
      outcome = "待回覆";
    }
    return {
      name: contact.name,
      company: contact.company ?? null,
      outcome,
      at: contact.createdAt,
    };
  });
}
