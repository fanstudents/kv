import "server-only";
import { getLineProfile } from "@/lib/line";
import { getSupabase } from "@/lib/supabase";
import type { SubscribersRepository } from "@/modules/subscribers/service";

export const supabaseSubscribersRepository: SubscribersRepository = {
  async list() {
    const { data, error } = await getSupabase()
      .from("line_subscribers")
      .select("*")
      .order("last_seen_at", { ascending: false });
    return { data, error };
  },

  async update(id, fields) {
    const { data, error } = await getSupabase()
      .from("line_subscribers")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    return { data, error };
  },

  async touch(lineUserId, channel) {
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
  },
};
