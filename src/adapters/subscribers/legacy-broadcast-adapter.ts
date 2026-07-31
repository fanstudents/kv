import "server-only";
import { pushLineRawMessages, type LineChannel } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import { getSupabase } from "@/lib/supabase";
import type { SubscribersBroadcastPort } from "@/modules/subscribers/broadcast-ports";

export function createLegacySubscribersBroadcastAdapter(): SubscribersBroadcastPort {
  const supabase = getSupabase();

  return {
    async listLogs() {
      const { data, error } = await supabase
        .from("broadcast_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return { data, error };
    },
    async listRecipients(request) {
      let query = supabase.from("line_subscribers").select("id, line_user_id, channel");
      if (request.tags.length > 0) query = query.overlaps("tags", request.tags);
      if (request.channel !== "all") query = query.eq("channel", request.channel);
      const { data, error } = await query;
      return { data, error };
    },
    async send(recipient, request) {
      await pushLineRawMessages(
        recipient.line_user_id,
        buildPushMessages({
          style: request.style,
          text: request.text,
          title: request.title,
          accentColor: request.accentColor,
        }),
        recipient.channel as LineChannel,
      );
    },
    async recordLog(log) {
      await supabase.from("broadcast_logs").insert(log);
    },
  };
}
