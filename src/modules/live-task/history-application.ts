import type { LiveTaskHistoryPort } from "./history-ports";
import {
  summarizeLiveTaskHistory,
  type LiveTaskHistoryItem,
  type LiveTaskHistoryRequest,
} from "./history-rules";

export interface LiveTaskHistoryResult {
  items: LiveTaskHistoryItem[];
}

export async function runLiveTaskHistory(
  input: LiveTaskHistoryRequest,
  port: LiveTaskHistoryPort,
): Promise<LiveTaskHistoryResult> {
  if (input.agentSlug !== "visit") return { items: [] };

  try {
    const contacts = await port.listContacts(8);
    if (!contacts.length) return { items: [] };

    const ids = contacts.map((contact) => contact.id);
    const [offers, invites] = await Promise.all([
      port.listOffers(ids),
      port.listInvites(ids),
    ]);
    return { items: summarizeLiveTaskHistory(contacts, offers, invites) };
  } catch {
    return { items: [] };
  }
}
