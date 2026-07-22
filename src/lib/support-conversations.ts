import "server-only";
import { getSupabase } from "@/lib/supabase";

// 客服帳號的完整對話紀錄（客戶說的話 + 官方帳號回覆的話），供之後想看完整對話串時使用。
// 跟 line_agent_activity 不同：那邊是給儀表板看的一行式活動摘要，這裡是逐則訊息、依時間排序。
export type ConversationRole = "customer" | "bot";

export async function logConversationMessage(lineUserId: string, role: ConversationRole, text: string) {
  const supabase = getSupabase();
  await supabase.from("line_support_conversations").insert({ line_user_id: lineUserId, role, text });
}
