import "server-only";

import { acquireLock, releaseLock } from "@/lib/conversation-lock";
import { getSupabase } from "@/lib/supabase";
import type { ConversationLockOptions, ConversationLockPort } from "@/modules/conversation/lock-ports";

export function createLegacyConversationLockAdapter(): ConversationLockPort {
  let supabase: ReturnType<typeof getSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    acquire(lineUserId, agentSlug, options?: ConversationLockOptions) {
      return acquireLock(getClient(), lineUserId, agentSlug, options);
    },
    release(lineUserId, agentSlug) {
      return releaseLock(getClient(), lineUserId, agentSlug);
    },
  };
}
