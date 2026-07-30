import "server-only";
import { budgetStatus } from "@/lib/ai-usage";
import { getSupabase } from "@/lib/supabase";
import type { AiUsageReadPort } from "@/modules/ai-usage/read-ports";
import type { AiUsageRow } from "@/modules/ai-usage/report-rules";

export function createLegacyAiUsageReadAdapter(): AiUsageReadPort {
  return {
    async listRows(limit) {
      const { data, error } = await getSupabase()
        .from("ai_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return { data: (data ?? []) as AiUsageRow[], error: error ? { message: error.message } : null };
    },
    getBudgetStatus() {
      return budgetStatus();
    },
  };
}
