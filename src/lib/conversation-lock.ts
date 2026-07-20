import "server-only";
import type { getSupabase } from "@/lib/supabase";

// 通用的「對話鎖定」：任何會話式 Agent（目前是 visit）在多輪對話進行中
// 先搶下這個 LINE 使用者的鎖，避免未來加入更多會話式 Agent 後，
// 使用者下一句話被不相關的流程誤判接手。單一 Agent 內部也用得到：
// 確保同一時間只有一組「名片辨識→確認→寄出」流程在跑。
const DEFAULT_TTL_MINUTES = 15;

type SupabaseClient = ReturnType<typeof getSupabase>;

export interface ConversationLock {
  line_user_id: string;
  owner_agent_slug: string;
  context: Record<string, unknown>;
  expires_at: string;
}

/**
 * 嘗試搶鎖。成功（沒有人持有，或鎖已過期，或本來就是自己持有）回傳 true 並更新／延長鎖；
 * 鎖被別的 agent 持有且未過期則回傳 false，呼叫端應該提示使用者先完成/取消進行中的流程。
 */
export async function acquireLock(
  supabase: SupabaseClient,
  lineUserId: string,
  agentSlug: string,
  opts?: { ttlMinutes?: number; context?: Record<string, unknown> }
): Promise<{ ok: true } | { ok: false; heldBy: string }> {
  const ttlMinutes = opts?.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

  const { data: existing } = await supabase
    .from("line_conversation_locks")
    .select("owner_agent_slug, expires_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  const isExpired = existing ? new Date(existing.expires_at).getTime() < Date.now() : true;
  const isSameOwner = existing?.owner_agent_slug === agentSlug;

  if (existing && !isExpired && !isSameOwner) {
    return { ok: false, heldBy: existing.owner_agent_slug };
  }

  await supabase.from("line_conversation_locks").upsert({
    line_user_id: lineUserId,
    owner_agent_slug: agentSlug,
    context: opts?.context ?? {},
    expires_at: expiresAt,
  });

  return { ok: true };
}

/** 只有鎖的持有者能釋放；避免流程 A 誤刪流程 B 剛搶下的鎖。 */
export async function releaseLock(supabase: SupabaseClient, lineUserId: string, agentSlug: string): Promise<void> {
  await supabase.from("line_conversation_locks").delete().eq("line_user_id", lineUserId).eq("owner_agent_slug", agentSlug);
}
