import "server-only";

import { isDatabaseJson } from "@/lib/database-json";
import { getMainSupabase } from "@/lib/supabase";
import type {
  ConversationLockOptions,
  ConversationLockPort,
} from "@/modules/conversation/lock-ports";

const DEFAULT_TTL_MINUTES = 15;

export function createSupabaseConversationLock(): ConversationLockPort {
  let supabase: ReturnType<typeof getMainSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    async acquire(lineUserId, agentSlug, options?: ConversationLockOptions) {
      const expiresAt = new Date(
        Date.now() + (options?.ttlMinutes ?? DEFAULT_TTL_MINUTES) * 60_000
      ).toISOString();
      const client = getClient();
      const { data: existing } = await client
        .from("line_conversation_locks")
        .select("owner_agent_slug, expires_at")
        .eq("line_user_id", lineUserId)
        .maybeSingle();

      const isExpired = existing
        ? new Date(existing.expires_at).getTime() < Date.now()
        : true;
      const isSameOwner = existing?.owner_agent_slug === agentSlug;

      if (existing && !isExpired && !isSameOwner) {
        return { ok: false, heldBy: existing.owner_agent_slug };
      }

      const context = options?.context ?? {};
      if (!isDatabaseJson(context)) throw new Error("Conversation lock context must be JSON serializable");

      await client.from("line_conversation_locks").upsert({
        line_user_id: lineUserId,
        owner_agent_slug: agentSlug,
        context,
        expires_at: expiresAt,
      });

      return { ok: true };
    },

    async release(lineUserId, agentSlug) {
      await getClient()
        .from("line_conversation_locks")
        .delete()
        .eq("line_user_id", lineUserId)
        .eq("owner_agent_slug", agentSlug);
    },
  };
}
