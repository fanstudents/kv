export interface VisitLiveTaskHistoryRequest {
  agentSlug: string;
}

export interface VisitLiveTaskHistoryContact {
  id: string;
  name: string;
  company: string | null;
  createdAt: string;
}

export interface VisitLiveTaskHistoryRelation {
  contactId: string;
  status: string;
  createdAt: string;
}

export interface VisitLiveTaskHistoryItem {
  name: string;
  company: string | null;
  outcome: string;
  at: string;
}

export interface VisitLiveTaskHistoryRepository {
  listContacts(limit: number): Promise<VisitLiveTaskHistoryContact[]>;
  listOffers(contactIds: string[]): Promise<VisitLiveTaskHistoryRelation[]>;
  listInvites(contactIds: string[]): Promise<VisitLiveTaskHistoryRelation[]>;
}

export function parseVisitLiveTaskHistoryRequest(agent: unknown): VisitLiveTaskHistoryRequest {
  return { agentSlug: typeof agent === "string" ? agent : "" };
}

export function summarizeVisitLiveTaskHistory(
  contacts: VisitLiveTaskHistoryContact[],
  offers: VisitLiveTaskHistoryRelation[],
  invites: VisitLiveTaskHistoryRelation[],
): VisitLiveTaskHistoryItem[] {
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

export interface VisitLiveTaskHistoryResult {
  items: VisitLiveTaskHistoryItem[];
}

export async function readVisitLiveTaskHistory(
  input: VisitLiveTaskHistoryRequest,
  repository: VisitLiveTaskHistoryRepository,
): Promise<VisitLiveTaskHistoryResult> {
  if (input.agentSlug !== "visit") return { items: [] };

  try {
    const contacts = await repository.listContacts(8);
    if (!contacts.length) return { items: [] };

    const ids = contacts.map((contact) => contact.id);
    const [offers, invites] = await Promise.all([
      repository.listOffers(ids),
      repository.listInvites(ids),
    ]);
    return { items: summarizeVisitLiveTaskHistory(contacts, offers, invites) };
  } catch {
    return { items: [] };
  }
}
