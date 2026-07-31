import type { VisitBusinessCard } from "./provider-port";
import type { LegacyContactRow, LegacyVisitOfferRow } from "./legacy-schema";

export type VisitLineContactIdRow = Pick<LegacyContactRow, "id">;
export type VisitLineOfferIdRow = Pick<LegacyVisitOfferRow, "id">;

export interface VisitLineCardPersistencePort {
  createContact(contact: VisitBusinessCard, lineUserId: string): Promise<VisitLineContactIdRow | null>;
  createOffer(lineUserId: string, contactId: string | undefined): Promise<VisitLineOfferIdRow | null>;
}
