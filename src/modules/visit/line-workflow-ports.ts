import type {
  LegacyPendingInviteStatus,
  LegacyPreparedInvite,
} from "@/modules/visit/legacy-schema";

export type VisitLineContactField = "name" | "company" | "title" | "email" | "phone";
export type VisitLineOfferResolution = "accepted" | "declined";
export type VisitLinePendingInviteStatus = Extract<LegacyPendingInviteStatus, "pending" | "cancelled" | "failed">;

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
  resolveOffer(id: string, outcome: VisitLineOfferResolution, resolvedAt: string): Promise<void>;
  updateContactField(contactId: string, field: VisitLineContactField, value: string): Promise<void>;
  findContact(contactId: string): Promise<VisitLineContactDetails | null>;
  createPendingInvite(lineUserId: string, invite: LegacyPreparedInvite): Promise<{ id: string }>;
  findPendingApprovalInvite(lineUserId: string): Promise<VisitLineApprovalInvite | null>;
  updateInviteStatus(id: string, status: VisitLinePendingInviteStatus): Promise<void>;
  updateInviteDraft(id: string, subject: string, body: string): Promise<void>;
}
