import "server-only";
import { budgetStatus } from "@/lib/ai-usage";
import { getSupabase } from "@/lib/supabase";
import type { AiUsageRepository, AiUsageRow } from "@/modules/ai-usage/usage";

export function createSupabaseAiUsageRepository(): AiUsageRepository {
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
