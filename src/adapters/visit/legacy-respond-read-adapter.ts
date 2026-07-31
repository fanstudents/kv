import "server-only";
import { getSupabase } from "@/lib/supabase";
import {
  toLegacyPendingInviteConfirmationPatch,
  type LegacyPendingInviteRow,
} from "@/modules/visit/legacy-schema";
import type { VisitInviteChoice } from "@/modules/visit/public-response";
import type { VisitRespondReadPort } from "@/modules/visit/respond-ports";

export function createLegacyVisitRespondReadAdapter(): VisitRespondReadPort {
  let supabase: ReturnType<typeof getSupabase> | null = null;
  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    async findInvite(inviteId) {
      const { data } = await getClient().from("pending_invites").select("*").eq("id", inviteId).maybeSingle();
      return data as LegacyPendingInviteRow | null;
    },
    async confirmInvite(inviteId, choice: VisitInviteChoice, resolvedAt) {
      const { data } = await getClient()
        .from("pending_invites")
        .update(toLegacyPendingInviteConfirmationPatch(choice, resolvedAt))
        .eq("id", inviteId)
        .eq("status", "pending")
        .select("*")
        .maybeSingle();
      return data as LegacyPendingInviteRow | null;
    },
    async refetchInvite(inviteId) {
      const { data } = await getClient().from("pending_invites").select("*").eq("id", inviteId).single();
      return data as LegacyPendingInviteRow;
    },
  };
}
