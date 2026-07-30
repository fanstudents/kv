import type { LiveTaskHistoryContact, LiveTaskHistoryRelation } from "./history-rules";

export interface LiveTaskHistoryPort {
  listContacts(limit: number): Promise<LiveTaskHistoryContact[]>;
  listOffers(contactIds: string[]): Promise<LiveTaskHistoryRelation[]>;
  listInvites(contactIds: string[]): Promise<LiveTaskHistoryRelation[]>;
}
