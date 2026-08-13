import "server-only";
import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import { getMainSupabase } from "@/lib/supabase";
import type { AgentTestPushPort } from "@/modules/agents/test-push";

export function createLineAgentTestPushAdapter(): AgentTestPushPort {
  const supabase = getMainSupabase();
  return {
    async send(delivery) {
      await pushLineRawMessages(
        delivery.to,
        buildPushMessages({
          style: delivery.style,
          text: delivery.text,
          title: delivery.title,
          accentColor: delivery.accentColor,
        }),
        delivery.channel
      );
    },
    async recordFailure(activity) {
      const { error } = await supabase.from("line_agent_activity").insert(activity);
      if (error) throw error;
    },
    async recordSuccess(activity) {
      const { data, error } = await supabase.from("line_agent_activity").insert(activity).select().single();
      if (error) throw error;
      return data ?? null;
    },
  };
}
