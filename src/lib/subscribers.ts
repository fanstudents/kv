import "server-only";
import { getSupabase } from "@/lib/supabase";
import { getLineProfile, type LineChannel } from "@/lib/line";

// 每次收到訊息就呼叫：新用戶就建檔（順便抓 LINE 顯示名稱），舊用戶更新最後互動時間。
// 抓 profile 失敗不影響主流程，靜默略過即可。
export async function touchSubscriber(lineUserId: string, channel: LineChannel = "primary") {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("line_subscribers")
    .select("id, display_name")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (existing) {
    await supabase.from("line_subscribers").update({ last_seen_at: new Date().toISOString() }).eq("id", existing.id);
    if (!existing.display_name) {
      const profile = await getLineProfile(lineUserId, channel).catch(() => null);
      if (profile?.displayName) {
        await supabase
          .from("line_subscribers")
          .update({ display_name: profile.displayName, picture_url: profile.pictureUrl ?? null })
          .eq("id", existing.id);
      }
    }
    return;
  }

  const profile = await getLineProfile(lineUserId, channel).catch(() => null);
  await supabase.from("line_subscribers").insert({
    line_user_id: lineUserId,
    channel,
    display_name: profile?.displayName ?? null,
    picture_url: profile?.pictureUrl ?? null,
  });
}
