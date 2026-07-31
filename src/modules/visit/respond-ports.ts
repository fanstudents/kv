import type { LegacyPendingInviteRow } from "@/modules/visit/legacy-schema";
import type { VisitInviteChoice } from "@/modules/visit/public-response";

export type VisitRespondFulfilmentRow = LegacyPendingInviteRow & { contacts: unknown };

export interface VisitRespondReadPort {
  findInvite(inviteId: string): Promise<LegacyPendingInviteRow | null>;
  confirmInvite(
    inviteId: string,
    choice: VisitInviteChoice,
    resolvedAt: string
  ): Promise<LegacyPendingInviteRow | null>;
  refetchInvite(inviteId: string): Promise<LegacyPendingInviteRow>;
  findInviteForFulfilment(inviteId: string): Promise<VisitRespondFulfilmentRow | null>;
}
