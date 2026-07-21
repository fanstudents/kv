import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// 客戶標籤：一組常用起始標籤 + 資料庫裡已用過的（line_subscribers.tags、contacts.tags）
export const STARTER_TAGS = ["潛在客戶", "合作夥伴", "供應商", "同業", "長期關注", "待跟進"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any>;

/** 可選標籤清單（起始 + 現有，去重）。LINE 快速回覆最多 13 顆，這裡留 12 給標籤。 */
export async function getAvailableTags(supabase: DB): Promise<string[]> {
  const set = new Set<string>(STARTER_TAGS);
  try {
    const { data: subs } = await supabase.from("line_subscribers").select("tags");
    (subs ?? []).forEach((s: { tags: string[] | null }) => (s.tags ?? []).forEach((t) => t && set.add(t)));
    const { data: cts } = await supabase.from("contacts").select("tags");
    (cts ?? []).forEach((c: { tags: string[] | null }) => (c.tags ?? []).forEach((t) => t && set.add(t)));
  } catch {
    /* 讀不到就只回起始標籤 */
  }
  return [...set].slice(0, 12);
}

/** 為聯絡人加上一個標籤（已存在則略過）。 */
export async function addContactTag(supabase: DB, contactId: string, tag: string): Promise<string[]> {
  try {
    const { data } = await supabase.from("contacts").select("tags").eq("id", contactId).maybeSingle();
    const cur: string[] = data?.tags ?? [];
    if (cur.includes(tag)) return cur;
    const next = [...cur, tag];
    await supabase.from("contacts").update({ tags: next }).eq("id", contactId);
    return next;
  } catch {
    return [];
  }
}
