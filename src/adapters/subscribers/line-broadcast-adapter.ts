import "server-only";
import { pushLineRawMessages, type LineChannel } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import { getMainSupabase } from "@/lib/supabase";
import type { BroadcastRecipient, SubscribersBroadcastPort } from "@/modules/subscribers/broadcast";

function toBroadcastRecipient(row: { id: string; line_user_id: string; channel: string }): BroadcastRecipient {
  // The Main DB migration constrains channel to primary/support; generated PostgREST types retain text.
  return { ...row, channel: row.channel as BroadcastRecipient["channel"] };
}

export function createLineSubscribersBroadcastAdapter(): SubscribersBroadcastPort {
  const supabase = getMainSupabase();

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
      return { data: data?.map(toBroadcastRecipient) ?? null, error };
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
