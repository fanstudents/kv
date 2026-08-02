import "server-only";

import { isDatabaseJson } from "@/lib/database-json";
import { getMainSupabase } from "@/lib/supabase";
import type {
  ConversationLockOptions,
  ConversationLockPort,
} from "@/modules/conversation/lock-ports";

const DEFAULT_TTL_MINUTES = 15;
type SupabaseConversationLockClient = ReturnType<typeof getMainSupabase>;
type ConversationLockDatabaseError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

export class ConversationLockRepositoryError extends Error {
  constructor(operation: string, databaseError: ConversationLockDatabaseError) {
    super(`Conversation lock could not ${operation}: ${databaseError.message}`, { cause: databaseError });
    this.name = "ConversationLockRepositoryError";
  }
}

async function readLock(client: SupabaseConversationLockClient, lineUserId: string) {
  const { data, error } = await client
    .from("line_conversation_locks")
    .select("owner_agent_slug, expires_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error) throw new ConversationLockRepositoryError("read current owner", error);
  return data;
}

async function resolveContendedLock(
  client: SupabaseConversationLockClient,
  lineUserId: string,
  agentSlug: string,
) {
  const current = await readLock(client, lineUserId);
  if (!current) {
    throw new ConversationLockRepositoryError("resolve acquisition contention", {
      message: "the competing lock disappeared before its owner could be identified",
    });
  }
  return current.owner_agent_slug === agentSlug
    ? ({ ok: true } as const)
    : ({ ok: false, heldBy: current.owner_agent_slug } as const);
}

export function createSupabaseConversationLock(): ConversationLockPort {
  let supabase: SupabaseConversationLockClient | null = null;

  const getClient = () => {
    if (!supabase) supabase = getMainSupabase();
    return supabase;
  };

  return {
    async acquire(lineUserId, agentSlug, options?: ConversationLockOptions) {
      const context = options?.context ?? {};
      if (!isDatabaseJson(context)) throw new Error("Conversation lock context must be JSON serializable");

      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + (options?.ttlMinutes ?? DEFAULT_TTL_MINUTES) * 60_000
      ).toISOString();
      const client = getClient();
      const existing = await readLock(client, lineUserId);

      const isExpired = existing
        ? new Date(existing.expires_at).getTime() < now.getTime()
        : true;
      const isSameOwner = existing?.owner_agent_slug === agentSlug;

      if (existing && !isExpired && !isSameOwner) {
        return { ok: false, heldBy: existing.owner_agent_slug };
      }

      const nextLock = {
        line_user_id: lineUserId,
        owner_agent_slug: agentSlug,
        context,
        expires_at: expiresAt,
      };

      if (existing) {
        const { data, error } = await client
          .from("line_conversation_locks")
          .update(nextLock)
          .eq("line_user_id", lineUserId)
          .eq("owner_agent_slug", existing.owner_agent_slug)
          .eq("expires_at", existing.expires_at)
          .select("owner_agent_slug")
          .maybeSingle();
        if (error) throw new ConversationLockRepositoryError("compare-and-swap current owner", error);
        if (!data) return resolveContendedLock(client, lineUserId, agentSlug);
        return { ok: true };
      }

      const { error } = await client.from("line_conversation_locks").insert(nextLock);
      if (!error) return { ok: true };
      if (error.code === "23505") return resolveContendedLock(client, lineUserId, agentSlug);
      throw new ConversationLockRepositoryError("create lock", error);
    },

    async release(lineUserId, agentSlug) {
      const { error } = await getClient()
        .from("line_conversation_locks")
        .delete()
        .eq("line_user_id", lineUserId)
        .eq("owner_agent_slug", agentSlug);
      if (error) throw new ConversationLockRepositoryError("release owner", error);
    },
  };
}
