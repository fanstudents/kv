import type {
  LegacyContactRow,
  LegacyPendingInviteStatus,
  LegacyPreparedInvite,
  LegacyVisitOfferRow,
} from "./legacy-schema";
import type { VisitBusinessCard } from "./provider-port";

/**
 * The external contracts for the Visit LINE workflow.
 *
 * These are grouped by the business boundary rather than by each webhook
 * handler. Implementations remain separate only where they own meaningful
 * side-effect ordering (image, offer, invite approval, timeout).
 */
export type VisitLineActivityStatus = "success" | "failed" | "pending";

export interface VisitLineActivityRecord {
  agent_slug?: string | null;
  summary: string;
  status: VisitLineActivityStatus;
}

export interface VisitLineActivityPort {
  record(activity: VisitLineActivityRecord): Promise<void>;
}

export interface VisitLineDeliveryPort {
  replyText(replyToken: string, text: string): Promise<void>;
  replyMessages(replyToken: string, messages: unknown[]): Promise<void>;
  pushText(lineUserId: string, text: string): Promise<void>;
}

export type VisitLineContactIdRow = Pick<LegacyContactRow, "id">;
export type VisitLineOfferIdRow = Pick<LegacyVisitOfferRow, "id">;

export interface VisitLineCardPersistencePort {
  createContact(contact: VisitBusinessCard, lineUserId: string): Promise<VisitLineContactIdRow | null>;
  createOffer(lineUserId: string, contactId: string | undefined): Promise<VisitLineOfferIdRow | null>;
}

export interface VisitLineImagePort {
  getImageDataUrl(messageId: string): Promise<string>;
  parseBusinessCard(imageDataUrl: string): Promise<VisitBusinessCard>;
}

export type VisitLineContactField = "name" | "company" | "title" | "email" | "phone";
export type VisitLineOfferResolution = "accepted" | "declined" | "timed_out";
export type VisitLinePendingInviteStatus = Extract<LegacyPendingInviteStatus, "pending" | "cancelled" | "failed">;

export interface VisitStaleOffer {
  id: string;
  lineUserId: string | null;
  contactId: string | null;
  contactName: string | null;
}

export interface VisitStaleOfferQuery {
  olderThan: string;
  notOlderThan: string;
  limit: number;
}

export interface VisitLineContactDetails {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email: string;
  phone?: string;
}

export interface VisitLineOfferConversation {
  id: string;
  contact: VisitLineContactDetails | null;
}

export interface VisitLineApprovalInvite {
  id: string;
  body: string;
  subject: string;
  slot1: string;
  slot2: string;
  contact: VisitLineContactDetails | null;
}

export interface VisitLineWorkflowPersistencePort {
  findPendingOffer(lineUserId: string): Promise<VisitLineOfferConversation | null>;
  findStaleOffers(query: VisitStaleOfferQuery): Promise<readonly VisitStaleOffer[]>;
  resolveOffer(id: string, outcome: VisitLineOfferResolution, resolvedAt: string): Promise<void>;
  updateContactField(contactId: string, field: VisitLineContactField, value: string): Promise<void>;
  findContact(contactId: string): Promise<VisitLineContactDetails | null>;
  createPendingInvite(lineUserId: string, invite: LegacyPreparedInvite): Promise<{ id: string }>;
  findPendingApprovalInvite(lineUserId: string): Promise<VisitLineApprovalInvite | null>;
  updateInviteStatus(id: string, status: VisitLinePendingInviteStatus): Promise<void>;
  updateInviteDraft(id: string, subject: string, body: string): Promise<void>;
}
